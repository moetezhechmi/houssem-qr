import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth-guard';

export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({}));
  if (typeof email !== 'string' || typeof password !== 'string') {
    return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'Email et mot de passe requis' } }, { status: 400 });
  }
  const { data, error } = await getAdminClient().auth.signInWithPassword({ email: email.trim(), password });
  if (error || !data.session?.access_token) {
    return NextResponse.json({ error: { code: 'LOGIN_FAILED', message: 'Email ou mot de passe incorrect' } }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true, email: email.trim() });
  res.cookies.set(ACCESS_TOKEN_COOKIE, data.session.access_token, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
