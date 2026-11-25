import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAdminClient } from './supabase';

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: 'server' | 'admin' | 'super_admin';
  status: string;
  store_id: string | null;
  store_name?: string | null;
  store_slug?: string | null;
  store_logo_url?: string | null;
  store_status?: string | null;
  created_at: string;
}

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

/** Résout et met en cache (par requête HTTP) l'employé actif et son store. */
const resolveCurrentEmployee = cache(async (): Promise<Employee | null> => {
  const token = await getAccessToken();
  if (!token) return null;
  const user = await fetchUserFromToken(token);
  if (!user?.id) return null;
  const { data: employee } = await getAdminClient().rpc('fn_get_employee_by_id', { p_user_id: user.id });
  if (!employee || employee.status !== 'active') return null;

  // Récupérer le store associé si l'employé en a un
  if (employee.store_id) {
    const { data: store } = await getAdminClient()
      .from('Stores')
      .select('status, name, slug, logo_url')
      .eq('id', employee.store_id)
      .maybeSingle();

    if (store) {
      employee.store_status = store.status;
      employee.store_name = store.name;
      employee.store_slug = store.slug;
      employee.store_logo_url = store.logo_url;
    }
  }

  // Si l'utilisateur est Moetez Hechmi ou a le rôle super_admin, lui accorder les pleins pouvoirs
  if (employee.email === 'grounmoetezhechmi@gmail.com' || employee.role === 'super_admin') {
    return { ...employee, role: 'super_admin' } as Employee;
  }

  return employee as Employee;
});

/**
 * Exige un employé connecté (via cookie sb_access_token + auth.users).
 * Rôles acceptés : 'server', 'admin', ou 'super_admin'.
 */
export async function getEmployee(requiredRole: 'server' | 'admin' | 'super_admin' = 'server'): Promise<Employee | null> {
  const employee = await resolveCurrentEmployee();
  if (!employee) return null;

  if (employee.role === 'super_admin') {
    return employee;
  }

  if (employee.store_status === 'suspended') {
    redirect('/store-suspended');
  }

  if (requiredRole === 'super_admin') return null;
  if (requiredRole === 'admin' && employee.role !== 'admin') return null;

  return employee;
}

/** Invoque une Edge Function avec le token d'accès de la session actuelle. */
export async function callEdge(fn: string, body: Record<string, unknown>, accessToken: string | null) {
  const { invokeEdge } = await import('./supabase');
  return invokeEdge(fn, body, { accessToken: accessToken ?? undefined });
}
