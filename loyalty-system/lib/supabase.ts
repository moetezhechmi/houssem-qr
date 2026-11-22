import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** Client Supabase Cloud — léger, pour l'espace CLIENT (lecture seule via Edge Function). */
export function getClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('Configuration Supabase manquante : NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  return createClient(url, key);
}

/** Client admin — Backend Serveurs/Admin (service_role — jamais exposé frontend). */
export function getAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('Configuration Supabase manquante');
  return createClient(url, key);
}

/** Invoke une Edge Function.
 *  - key 'service'   : pour les serveurs/admin (session Cookie dans Next).
 *  - key 'anon'      : pour le client (public).
 */
export interface EdgeFnError { code: string; message: string; detail?: string; }

export async function invokeEdge(
  fn: string,
  body: Record<string, unknown>,
  opts: { key?: 'service' | 'anon'; accessToken?: string } = {},
): Promise<{ ok: true; data: any } | { ok: false; error: EdgeFnError }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const useService = opts.key !== 'anon';
  const rawKey = useService ? process.env.SUPABASE_SERVICE_ROLE_KEY : process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const token = opts.accessToken ?? rawKey;
  if (!url || !token) throw new Error('Configuration Supabase manquante pour invokeEdge');
  const res = await fetch(`${url}/functions/v1/${fn}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: rawKey ?? token,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let parsed: any = null;
    try { parsed = JSON.parse(text); } catch { parsed = null; }
    return { ok: false, error: parsed?.error ?? { code: `HTTP_${res.status}`, message: text.slice(0, 300) } };
  }
  return { ok: true, data: await res.json().catch(() => null) };
}
