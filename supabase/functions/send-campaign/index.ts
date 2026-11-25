import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const admin = createClient(SUPABASE_URL, SERVICE_KEY);

function json(status: number, obj: unknown) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  const body = await req.json().catch(() => null);
  let campaign: any = null;

  if (body?.campaign_id) {
    const { data } = await admin.from('NotificationCampaigns').select('*').eq('id', body.campaign_id).maybeSingle();
    campaign = data;
  } else {
    campaign = {
      id: null,
      store_id: body?.store_id ?? null,
      title: String(body?.title ?? 'Notification'),
      message: String(body?.message ?? ''),
      image_url: body?.image_url ?? null,
      target: body?.target ?? 'all',
    };
  }

  if (!campaign?.message) return json(400, { error: 'INVALID_INPUT', message: 'message requis' });

  // 1. Filtrer les clients STRICTEMENT selon le Store ID
  let customersQuery = admin.from('Customers').select('id');
  
  if (campaign.store_id) {
    // Ne sélectionner que les clients inscrits dans ce café / store
    customersQuery = customersQuery.eq('store_id', campaign.store_id);
  }

  const { data: customers } = await customersQuery;
  let customerIds = (customers ?? []).map((c: any) => c.id);

  // Si aucun client dans ce café, on arrête l'envoi proprement
  if (customerIds.length === 0) {
    return json(200, { success: true, count: 0, message: 'Aucun client pour cet établissement' });
  }

  // 2. Filtrer selon les préférences marketing si ciblage marketing
  if (campaign.target === 'marketing') {
    const { data: prefs } = await admin
      .from('NotificationPreferences')
      .select('customer_id')
      .in('customer_id', customerIds)
      .eq('marketing_enabled', true);
    const allowed = new Set((prefs ?? []).map((p: any) => p.customer_id));
    customerIds = customerIds.filter((id: string) => allowed.has(id));
  }

  const dedupKey = campaign.id ? `campaign:${campaign.id}` : null;
  const pushType = campaign.target === 'marketing' ? 'marketing' : 'generic';

  // Récupérer le nom et le logo du store si store_id est présent
  let storeInfo = null;
  if (campaign.store_id) {
    const { data: st } = await admin.from('Stores').select('name, logo_url').eq('id', campaign.store_id).maybeSingle();
    storeInfo = st;
  }

  const notificationTitle = campaign.title || storeInfo?.name || 'Notification';
  const notificationIcon = storeInfo?.logo_url || '/logo_houssem.jpeg';

  // 3. Déclencher l'envoi push uniquement à cette liste isolée
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer_ids: customerIds,
      store_id: campaign.store_id || null,
      type: pushType,
      title: notificationTitle,
      message: campaign.message,
      icon: notificationIcon,
      image_url: campaign.image_url || null,
      btn_text: body?.btn_text || 'Découvrir',
      btn_action: body?.btn_action || 'close',
      url: '/',
      dedup_key: dedupKey,
    }),
  });

  if (campaign.id) {
    await admin.from('NotificationCampaigns').update({
      status: res.ok ? 'sent' : 'failed',
      sent_at: res.ok ? new Date().toISOString() : null,
    }).eq('id', campaign.id);
  }

  return json(res.status, {
    sent_count: customerIds.length,
    status: res.ok ? 'ok' : 'error',
    store_id: campaign.store_id || 'all',
  });
});
