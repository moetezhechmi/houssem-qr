import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminClient } from './supabase';
import { ACCESS_TOKEN_COOKIE } from './auth-guard';

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

export function apiError(status: number, code: string, message?: string): Response {
  return NextResponse.json({ error: { code, message: message ?? code } }, { status });
}

/** Vérifie qu'un employé actif est connecté (cookie + /auth/v1/user + fn_get_employee_by_id). */
export async function requireEmployeeUser(role: 'server' | 'admin' = 'server'): Promise<any | null> {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return null;
  const user = await fetchUserFromToken(token);
  if (!user?.id) return null;
  const { data: employee } = await getAdminClient().rpc('fn_get_employee_by_id', { p_user_id: user.id });
  if (!employee || employee.status !== 'active') return null;
  if (role === 'admin' && employee.role !== 'admin') return null;
  return employee;
}

export { apiError as apiErrorResponse };
