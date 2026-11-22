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
  const sub = body?.subscription;
  if (!token || !sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return json(400, { error: 'INVALID_INPUT', message: 'token et subscription requis' });
  }

  const tokenHash = createHash('sha256').update(token, 'utf8').digest('hex');
  const { data: card, error: cardErr } = await admin.rpc('fn_get_client_card', { p_token_hash: tokenHash });
  if (cardErr || !card?.customer?.id) return json(404, { error: 'CARD_NOT_FOUND', message: 'Carte introuvable' });

  const customerId = card.customer.id;

  const { error: upErr } = await admin.from('PushSubscriptions').upsert({
    customer_id: customerId,
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
    device_type: body?.device_type ?? null,
    user_agent: body?.user_agent ?? null,
    is_active: true,
    last_used_at: new Date().toISOString(),
  }, { onConflict: 'customer_id,endpoint' });

  if (upErr) return json(500, { error: 'SUBSCRIBE_FAILED', message: upErr.message });

  // Merge preferences: keep existing marketing_enabled unless explicitly provided.
  const { data: existingPref } = await admin.from('NotificationPreferences').select('marketing_enabled').eq('customer_id', customerId).maybeSingle();
  const marketingProvided = body?.marketing !== undefined || body?.marketing_enabled !== undefined;
  const marketingEnabled = marketingProvided
    ? (body?.marketing === true || body?.marketing_enabled === true)
    : (existingPref?.marketing_enabled ?? false);

  await admin.from('NotificationPreferences').upsert({
    customer_id: customerId,
    push_enabled: true,
    marketing_enabled: marketingEnabled,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'customer_id' });

  return json(200, { ok: true });
});