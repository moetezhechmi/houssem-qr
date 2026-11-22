// expire-jobs — Job automatique — Ferme les cartes expirées, marque les récompenses expirées.
// À planifier via Supabase Cron (ou déclenchement périodique).

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

async function call(fn: string, params: Record<string, unknown>): Promise<{ data?: any; error?: { code: string; message: string } }> {
  const key = SUPABASE_SERVICE_ROLE_KEY;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const body: any = await res.json().catch(() => null);
    return { error: { code: body?.code ?? `HTTP_${res.status}`, message: body?.message ?? `Requête échouée (${res.status})` } };
  }
  return { data: (await res.json()) as any };
}
function json(status: number, obj: unknown): Response {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

Deno.serve(async () => {
  const { data, error } = await call('fn_expire_jobs', {});
  if (error) return json(500, { error: { code: error.code, message: error.message } });
  return json(200, data);
});
