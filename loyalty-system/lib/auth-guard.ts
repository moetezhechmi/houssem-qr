import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAdminClient } from './supabase';

export interface Employee { id: string; name: string; email: string; role: string; status: string; created_at: string; }

export const ACCESS_TOKEN_COOKIE = 'sb_access_token';

export async function getAccessToken(): Promise<string | null> {
  return (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value ?? null;
}

/** GET /auth/v1/user — appelé côté serveur avec un Access Token Supabase explicite. */
async function fetchUserFromToken(accessToken: string): Promise<any | null> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '', Authorization: `Bearer ${accessToken}` },
  }).catch(() => null);
  if (!res?.ok) return null;
  try {
    const data: any = await res.json();
    return data?.user ?? data ?? null;
  } catch { return null; }
}

/**
 * Exige un employé connecté (via cookie sb_access_token + auth.users).
 * Optionnellement du rôle 'admin'. Retourne null en cas d'échec.
 */
export async function getEmployee(requiredRole: 'server' | 'admin' = 'server'): Promise<Employee | null> {
  const token = await getAccessToken();
  if (!token) return null;
  const user = await fetchUserFromToken(token);
  if (!user?.id) return null;
  const { data: employee } = await getAdminClient().rpc('fn_get_employee_by_id', { p_user_id: user.id });
  if (!employee || employee.status !== 'active') return null;
  if (requiredRole === 'admin' && employee.role !== 'admin') return null;
  return employee as Employee;
}

/** Invoque une Edge Function avec le token d'accès de la session actuelle. */
export async function callEdge(fn: string, body: Record<string, unknown>, accessToken: string | null) {
  const { invokeEdge } = await import('./supabase');
  return invokeEdge(fn, body, { accessToken: accessToken ?? undefined });
}
