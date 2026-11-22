import { createClient } from 'npm:@supabase/supabase-js@2';
import { createHash } from 'node:crypto';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const admin = createClient(SUPABASE_URL, SERVICE_KEY);

function json(status: number, obj: unknown) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  const body = await req.json().catch(() => null);
  let customerId: string | null = null;
  let rewardId: string | null = null;

  if (body?.token) {
    const tokenHash = createHash('sha256').update(String(body.token), 'utf8').digest('hex');
    const { data: card } = await admin.rpc('fn_get_client_card', { p_token_hash: tokenHash });
    customerId = card?.customer?.id ?? null;
  } else if (body?.card_id) {
    const { data: card } = await admin.from('LoyaltyCards').select('customer_id').eq('id', body.card_id).maybeSingle();
    customerId = card?.customer_id ?? null;
  }

  if (!customerId) return json(404, { error: 'CARD_NOT_FOUND', message: 'Carte introuvable' });

  // Find available reward
  const { data: rewards } = await admin.from('Rewards').select('id').eq('customer_id', customerId).eq('status', 'available').limit(1);
  rewardId = rewards?.[0]?.id ?? null;
  if (!rewardId) return json(200, { ok: true, skipped: 'no_reward' });

  const dedupKey = `reward_unlocked:${rewardId}`;

  // Call send-push
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer_ids: [customerId],
      type: 'reward',
      title: 'Félicitations !',
      message: 'Vous avez débloqué une réduction de 30 % sur votre prochaine commande.',
      url: body?.token ? `/client/${body.token}` : '/',
      dedup_key: dedupKey,
      related_reward_id: rewardId,
    }),
  });
  const data = await res.json().catch(() => ({}));
  return json(res.status, data);
});