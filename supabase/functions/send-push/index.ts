import { createClient } from 'npm:@supabase/supabase-js@2';
import * as webpush from 'npm:web-push';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com';

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

function json(status: number, obj: unknown) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  const body = await req.json().catch(() => null);
  const type = String(body?.type ?? 'generic');
  const title = String(body?.title ?? 'Bieny Coffeeshop');
  const message = String(body?.message ?? '');
  const url = String(body?.url ?? '/');
  const icon = String(body?.icon ?? '/logo_houssem.jpeg');
  const dedupKey = body?.dedup_key ? String(body.dedup_key) : null;
  const customerIds: string[] | null = Array.isArray(body?.customer_ids) ? body.customer_ids : null;
  const marketing = body?.marketing === true;

  if (!message) return json(400, { error: 'INVALID_INPUT', message: 'message requis' });

  // Idempotence
  if (dedupKey) {
    const { data: existing } = await admin.from('NotificationHistory').select('id').eq('dedup_key', dedupKey).limit(1);
    if (existing && existing.length > 0) return json(200, { ok: true, skipped: 'duplicate' });
  }

  // Fetch subscriptions
  let q = admin.from('PushSubscriptions').select('id, customer_id, endpoint, p256dh, auth').eq('is_active', true);
  if (customerIds && customerIds.length > 0) q = q.in('customer_id', customerIds);
  const { data: subs, error: sErr } = await q;
  if (sErr) return json(500, { error: 'FETCH_FAILED', message: sErr.message });

  // Filter subscriptions matching target customers
  const activeSubs = subs ?? [];
  if (activeSubs.length === 0) {
    return json(200, { ok: true, sent: 0, results: [] });
  }

  // Batch-fetch preferences in one single query to save database roundtrips
  const subCustomerIds = [...new Set(activeSubs.map((s: any) => s.customer_id))];
  const { data: allPrefs } = await admin.from('NotificationPreferences').select('*').in('customer_id', subCustomerIds);
  const prefMap = new Map((allPrefs ?? []).map((p: any) => [p.customer_id, p]));

  const eligibleSubs = activeSubs.filter((sub: any) => {
    const pref = prefMap.get(sub.customer_id);
    if (!pref?.push_enabled) return false;
    if (type === 'marketing' && !pref.marketing_enabled) return false;
    if (type === 'reward' && !pref.reward_notifications) return false;
    if (type === 'reminder' && !pref.reminder_notifications) return false;
    if (type === 'progress' && !pref.progress_notifications) return false;
    if (type === 'card' && !pref.card_notifications) return false;
    return true;
  });

  const payload = JSON.stringify({
    title,
    body: message,
    icon,
    badge: icon,
    data: { url }
  });

  // Parallel sending with Promise.allSettled (fast & lightweight for free tier CPU)
  const tasks = eligibleSubs.map(async (sub: any) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
      await admin.from('NotificationHistory').insert({
        customer_id: sub.customer_id,
        subscription_id: sub.id,
        type,
        title,
        message,
        status: 'sent',
        related_reward_id: body?.related_reward_id ?? null,
        related_card_id: body?.related_card_id ?? null,
        dedup_key: dedupKey ? `${dedupKey}_${sub.id}` : null,
      });
      await admin.from('PushSubscriptions').update({ last_used_at: new Date().toISOString() }).eq('id', sub.id);
      return { subscription: sub.id, status: 'sent' };
    } catch (err: any) {
      const code = err?.statusCode;
      if (code === 410 || code === 404) {
        await admin.from('PushSubscriptions').update({ is_active: false }).eq('id', sub.id);
      }
      const errMsg = String(err?.message ?? err ?? 'unknown');
      await admin.from('NotificationHistory').insert({
        customer_id: sub.customer_id,
        subscription_id: sub.id,
        type,
        title,
        message,
        status: `failed_${code ?? 'unknown'}`,
        related_reward_id: body?.related_reward_id ?? null,
        related_card_id: body?.related_card_id ?? null,
        dedup_key: dedupKey ? `${dedupKey}_${sub.id}` : null,
      });
      return { subscription: sub.id, status: 'failed', code, error: errMsg };
    }
  });

  const settled = await Promise.allSettled(tasks);
  const results = settled.map((s) => (s.status === 'fulfilled' ? s.value : { status: 'failed', error: 'Promise rejected' }));

  return json(200, { ok: true, sent: results.filter((r: any) => r.status === 'sent').length, results });
});