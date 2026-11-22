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
  const token = String(body?.token ?? '').trim();
  const endpoint = String(body?.endpoint ?? '').trim();
  if (!token || !endpoint) return json(400, { error: 'INVALID_INPUT', message: 'token et endpoint requis' });

  const tokenHash = createHash('sha256').update(token, 'utf8').digest('hex');
  const { data: card } = await admin.rpc('fn_get_client_card', { p_token_hash: tokenHash });
  if (!card?.customer?.id) return json(404, { error: 'CARD_NOT_FOUND', message: 'Carte introuvable' });

  await admin.from('PushSubscriptions').update({ is_active: false }).eq('customer_id', card.customer.id).eq('endpoint', endpoint);
  await admin.from('NotificationPreferences').update({ push_enabled: false, updated_at: new Date().toISOString() }).eq('customer_id', card.customer.id);

  return json(200, { ok: true });
});