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
      title: String(body?.title ?? 'Bieny Coffeeshop'),
      message: String(body?.message ?? ''),
      image_url: body?.image_url ?? null,
      target: body?.target ?? 'all',
    };
  }

  if (!campaign?.message) return json(400, { error: 'INVALID_INPUT', message: 'message requis' });

  // Fetch target customers
  let customersQuery = admin.from('Customers').select('id');
  const { data: customers } = await customersQuery;
  let customerIds = (customers ?? []).map((c: any) => c.id);

  // If marketing-only, filter by preferences
  if (campaign.target === 'marketing') {
    const { data: prefs } = await admin.from('NotificationPreferences').select('customer_id').eq('marketing_enabled', true);
    const allowed = new Set((prefs ?? []).map((p: any) => p.customer_id));
    customerIds = customerIds.filter((id: string) => allowed.has(id));
  }

  const dedupKey = campaign.id ? `campaign:${campaign.id}` : null;

  // 'all' targets must not require marketing_enabled; only marketing targets are 'marketing' type.
  const pushType = campaign.target === 'marketing' ? 'marketing' : 'generic';

  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer_ids: customerIds,
      type: pushType,
      title: campaign.title,
      message: campaign.message,
      icon: campaign.image_url || '/logo_houssem.jpeg',
      url: '/',
      dedup_key: dedupKey,
    }),
  });
  const data = await res.json().catch(() => ({}));

  if (campaign.id) {
    await admin.from('NotificationCampaigns').update({
      status: res.ok ? 'sent' : 'failed',
      sent_at: res.ok ? new Date().toISOString() : null,
    }).eq('id', campaign.id);
  }

  return json(res.status, data);
});