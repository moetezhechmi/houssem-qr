import webpush from 'web-push';
import { getAdminClient } from './supabase';

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

export interface SendPushParams {
  storeId?: string | null;
  target?: string; // 'all' | 'marketing'
  title: string;
  message: string;
  imageUrl?: string | null;
  btnText?: string;
  btnAction?: string;
  campaignId?: string | null;
}

/**
 * Envoie une notification push STRICTEMENT isolée aux clients d'un établissement.
 * Ne dépend pas d'Edge Functions déphasées : tourne directement dans le serveur Next.js.
 */
export async function sendStorePushNotification(params: SendPushParams) {
  const { storeId, target = 'all', title, message, imageUrl, btnText = 'Découvrir', btnAction = 'close', campaignId } = params;
  const admin = getAdminClient();

  // 1. Récupérer les informations du Store
  let storeName = 'Notification';
  let storeLogo = '/logo_houssem.jpeg';

  if (storeId) {
    const { data: store } = await admin
      .from('Stores')
      .select('name, logo_url')
      .eq('id', storeId)
      .maybeSingle();

    if (store) {
      storeName = store.name;
      if (store.logo_url) storeLogo = store.logo_url;
    }
  }

  const finalTitle = title || storeName;
  const finalIcon = storeLogo;

  // 2. Récupérer UNIQUEMENT les clients du Store spécifié
  let customersQuery = admin.from('Customers').select('id');
  if (storeId) {
    customersQuery = customersQuery.eq('store_id', storeId);
  }

  const { data: customers, error: custErr } = await customersQuery;
  if (custErr || !customers || customers.length === 0) {
    return { ok: true, sent: 0, reason: 'Aucun client pour cet établissement' };
  }

  let customerIds = customers.map((c) => c.id);

  // 3. Filtrer par préférences marketing si applicable
  if (target === 'marketing') {
    const { data: prefs } = await admin
      .from('NotificationPreferences')
      .select('customer_id')
      .in('customer_id', customerIds)
      .eq('marketing_enabled', true);

    const allowed = new Set((prefs ?? []).map((p) => p.customer_id));
    customerIds = customerIds.filter((id) => allowed.has(id));
  }

  if (customerIds.length === 0) {
    return { ok: true, sent: 0, reason: 'Aucun client éligible selon les préférences' };
  }

  // 4. Récupérer les abonnements push actifs UNIQUEMENT pour ces clients
  const { data: subs, error: subsErr } = await admin
    .from('PushSubscriptions')
    .select('id, customer_id, endpoint, p256dh, auth')
    .eq('is_active', true)
    .in('customer_id', customerIds);

  if (subsErr || !subs || subs.length === 0) {
    return { ok: true, sent: 0, reason: 'Aucun appareil abonné pour les clients de ce café' };
  }

  // 5. Payload push standardisé
  const payload = JSON.stringify({
    title: finalTitle,
    body: message,
    icon: finalIcon,
    badge: finalIcon,
    type: target === 'marketing' ? 'marketing' : 'generic',
    image_url: imageUrl || null,
    btn_text: btnText,
    btn_action: btnAction,
    data: {
      url: '/',
      title: finalTitle,
      body: message,
      type: target === 'marketing' ? 'marketing' : 'generic',
      image_url: imageUrl || null,
      btn_text: btnText,
      btn_action: btnAction,
    },
  });

  const dedupKey = campaignId ? `campaign:${campaignId}` : `push_${Date.now()}`;

  // 6. Envoi direct aux abonnés identifiés du store
  const tasks = subs.map(async (sub) => {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload
      );

      await admin.from('NotificationHistory').insert({
        customer_id: sub.customer_id,
        subscription_id: sub.id,
        type: target === 'marketing' ? 'marketing' : 'generic',
        title: finalTitle,
        message,
        status: 'sent',
        store_id: storeId || null,
        dedup_key: `${dedupKey}_${sub.id}`,
      });

      await admin
        .from('PushSubscriptions')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', sub.id);

      return { status: 'sent', id: sub.id };
    } catch (err: any) {
      const code = err?.statusCode;
      if (code === 410 || code === 404) {
        // Appareil désinscrit
        await admin.from('PushSubscriptions').update({ is_active: false }).eq('id', sub.id);
      }

      await admin.from('NotificationHistory').insert({
        customer_id: sub.customer_id,
        subscription_id: sub.id,
        type: target === 'marketing' ? 'marketing' : 'generic',
        title: finalTitle,
        message,
        status: `failed_${code ?? 'unknown'}`,
        store_id: storeId || null,
        dedup_key: `${dedupKey}_${sub.id}`,
      });

      return { status: 'failed', id: sub.id, error: err.message };
    }
  });

  const results = await Promise.allSettled(tasks);
  const sentCount = results.filter(
    (r) => r.status === 'fulfilled' && (r.value as any).status === 'sent'
  ).length;

  return { ok: true, sent: sentCount, totalSubs: subs.length };
}
