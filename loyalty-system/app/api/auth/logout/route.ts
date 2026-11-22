import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminClient } from '@/lib/supabase';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth-guard';

export async function POST(req: Request) {
  const jar = await cookies();
  const token = jar.get(ACCESS_TOKEN_COOKIE)?.value;
  if (token) await getAdminClient().auth.signOut().catch(() => null);
  const res = NextResponse.redirect(new URL('/serveur/login', req.url), 303);
  res.cookies.set(ACCESS_TOKEN_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 });
  return res;
}
