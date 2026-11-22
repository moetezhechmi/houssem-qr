import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const admin = createClient(SUPABASE_URL, SERVICE_KEY);

function json(status: number, obj: unknown) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

async function sendOne(customerId: string, type: string, title: string, message: string, dedupKey: string, url = '/') {
  // Idempotence check
  const { data: existing } = await admin.from('NotificationHistory').select('id').eq('dedup_key', dedupKey).limit(1);
  if (existing && existing.length > 0) return false;
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ customer_ids: [customerId], type, title, message, url, dedup_key: dedupKey }),
  });
  return res.ok;
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('CRON_SECRET');
  if (secret) {
    const h = req.headers.get('x-cron-secret');
    if (h !== secret) return json(401, { error: 'UNAUTHORIZED' });
  }

  const now = new Date();
  const hour = now.getUTCHours();
  if (hour >= 20 || hour < 7) {
    return json(200, { ok: true, skipped: 'quiet_hours' });
  }

  const summary: any = { reward_reminders: 0, card_reminders: 0, progress_reminders: 0, campaigns: 0 };

  // 1. Reward reminders (24h before expiry) — parallel
  const in24h = new Date(now.getTime() + 24 * 3600 * 1000).toISOString();
  const { data: rewards } = await admin.from('Rewards')
    .select('id, customer_id, expires_at')
    .eq('status', 'available')
    .lte('expires_at', in24h)
    .gte('expires_at', now.toISOString())
    .limit(50);

  const rewardTasks = (rewards ?? []).map((r: any) =>
    sendOne(r.customer_id, 'reminder', 'Votre réduction expire bientôt !',
      'Votre réduction de 30 % expire bientôt ! Profitez-en lors de votre prochaine visite.',
      `reward_reminder_24h:${r.id}`).then((ok) => { if (ok) summary.reward_reminders++; })
  );
  await Promise.all(rewardTasks);

  // 2. Card reminders (expires in 3 days, no pending reward) — parallel
  const in3d = new Date(now.getTime() + 3 * 24 * 3600 * 1000).toISOString();
  const { data: cards } = await admin.from('LoyaltyCards')
    .select('id, customer_id, expiration_date')
    .eq('status', 'active')
    .lte('expiration_date', in3d)
    .gte('expiration_date', now.toISOString())
    .limit(50);

  // Batch fetch available rewards for these customers
  const cardCustomerIds = (cards ?? []).map((c: any) => c.customer_id);
  const { data: availRewards } = cardCustomerIds.length > 0
    ? await admin.from('Rewards').select('customer_id').eq('status', 'available').in('customer_id', cardCustomerIds)
    : { data: [] };
  const hasReward = new Set((availRewards ?? []).map((r: any) => r.customer_id));

  const cardTasks = (cards ?? [])
    .filter((c: any) => !hasReward.has(c.customer_id))
    .map((c: any) => {
      const dedupKey = `card_reminder:${c.id}:${now.toISOString().slice(0,10)}`;
      return sendOne(c.customer_id, 'card', 'Votre carte expire bientôt',
        'Votre carte de fidélité expire bientôt. Pensez à utiliser vos consommations.', dedupKey)
        .then((ok) => { if (ok) summary.card_reminders++; });
    });
  await Promise.all(cardTasks);

  // 3. Progress reminders (weekly throttle, 1-2 remaining) — parallel
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString();
  const { data: activeCards } = await admin.from('LoyaltyCards')
    .select('id, customer_id')
    .eq('status', 'active')
    .limit(100);

  const progressTasks = (activeCards ?? []).map(async (c: any) => {
    const { data: cycle } = await admin.from('LoyaltyCycles').select('current_consumptions, required_consumptions').eq('card_id', c.id).eq('status', 'active').maybeSingle();
    if (!cycle) return;
    const remaining = cycle.required_consumptions - cycle.current_consumptions;
    if (remaining !== 1 && remaining !== 2) return;
    const { data: last } = await admin.from('NotificationHistory').select('sent_at').eq('customer_id', c.customer_id).eq('type', 'progress').order('sent_at', { ascending: false }).limit(1);
    if (last && last.length > 0 && last[0].sent_at > sevenDaysAgo) return;
    const dedupKey = `progress:${c.id}:${now.toISOString().slice(0,10)}`;
    const ok = await sendOne(c.customer_id, 'progress', `Plus que ${remaining} consommations !`,
      `Plus que ${remaining} consommations pour débloquer votre réduction de 30 % !`, dedupKey);
    if (ok) summary.progress_reminders++;
  });
  await Promise.all(progressTasks);

  // 4. Scheduled campaigns
  const { data: campaigns } = await admin.from('NotificationCampaigns')
    .select('id')
    .eq('status', 'scheduled')
    .lte('scheduled_at', now.toISOString())
    .limit(10);

  const campTasks = (campaigns ?? []).map(async (camp: any) => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-campaign`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaign_id: camp.id }),
    });
    if (res.ok) summary.campaigns++;
  });
  await Promise.all(campTasks);

  return json(200, { ok: true, ...summary });
});