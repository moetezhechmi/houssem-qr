// renew-card — Serveur / Admin — Crée une nouvelle carte (nouveau cycle de 30 jours) pour un client expiré.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SUPABASE_PUBLISHABLE_KEY = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? '';

async function call<T>(fn: string, params: Record<string, unknown>): Promise<{ data?: T; error?: { code: string; message: string } }> {
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
  return { data: (await res.json()) as T | undefined };
}
function json(status: number, obj: unknown): Response {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}
async function getEmployeeFromToken(accessToken: string): Promise<{ employee: any; error: { code: string; message: string } | null }> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return { employee: null, error: { code: 'UNAUTHORIZED', message: 'Session Supabase invalide' } };
  let user: any = null;
  try {
    const data: any = await res.json();
    user = data?.user ?? data ?? null;
  } catch { user = null; }
  if (!user?.id) return { employee: null, error: { code: 'UNAUTHORIZED', message: 'Session Supabase invalide' } };
  const { data, error } = await call('fn_get_employee_by_id', { p_user_id: user.id });
  if (error || !data) return { employee: null, error: { code: 'UNAUTHORIZED', message: 'Employé introuvable' } };
  if (data.status !== 'active') return { employee: null, error: { code: 'INACTIVE', message: 'Compte employé désactivé' } };
  return { employee: data, error: null };
}

Deno.serve(async (req) => {
  const { employee, error } = await getEmployeeFromToken(req.headers.get('Authorization') ?? '');
  if (error) return json(401, { error: { code: error.code, message: error.message } });
  if (employee.role !== 'server' && employee.role !== 'admin') {
    return json(403, { error: { code: 'FORBIDDEN', message: 'Seuls les serveurs et les administrateurs peuvent créer des cartes.' } });
  }
  const body = await req.json().catch(() => null);
  if (typeof body?.customer_id !== 'string' || !body.customer_id) {
    return json(400, { error: { code: 'CUSTOMER_ID_REQUIRED', message: 'Un customer_id est requis.' } });
  }
  const { data, error: fnError } = await call('fn_renew_card', { p_customer_id: body.customer_id });
  if (fnError) return json(400, { error: { code: fnError.code, message: fnError.message } });
  return json(200, data);
});
