// get-client-card — PUBLIC — Fiche client : lecture seule via lien personnel (URL /client/<token> → token_hash).
// Utilise SUPABASE_SERVICE_ROLE_KEY si configuré, sinon SUPABASE_PUBLISHABLE_KEY (RLS anon en lecture).

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SUPABASE_PUBLISHABLE_KEY = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? '';
const KEY = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_PUBLISHABLE_KEY;

async function call<T>(fn: string, params: Record<string, unknown>): Promise<{ data?: T; error?: { code: string; message: string } }> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const body: any = await res.json().catch(() => null);
    return { error: { code: body?.code ?? `HTTP_${res.status}`, message: body?.message ?? `Requête échouée (${res.status})` } };
  }
  return { data: (await res.json()) as T | undefined };
}

function json(status: number, obj: unknown): Response {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  const body = await req.json().catch(() => null);
  const tokenHash = body?.token_hash;
  if (typeof tokenHash !== 'string' || !tokenHash) {
    return json(400, { error: { code: 'TOKEN_HASH_REQUIRED', message: 'Un token_hash est requis (empreinte du lien personnel).' } });
  }
  const { data, error } = await call<Record<string, any> | null>('fn_get_client_card', { p_token_hash: tokenHash });
  if (error) return json(error.code === 'NOT_FOUND' ? 404 : 500, { error: { code: error.code, message: error.message } });
  if (!data) return json(404, { error: { code: 'CARD_NOT_FOUND', message: 'Carte introuvable pour ce lien personnel.' } });
  return json(200, data);
});
