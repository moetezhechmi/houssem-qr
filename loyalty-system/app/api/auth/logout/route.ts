import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminClient } from '@/lib/supabase';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth-guard';

export async function POST(req: Request) {
  const jar = await cookies();
  const token = jar.get(ACCESS_TOKEN_COOKIE)?.value;
  if (token) await getAdminClient().auth.signOut().catch(() => null);

  // Construire l'origine publique réelle (Render / reverse proxy envoie x-forwarded-host)
  const fwdHost = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const fwdProto = (req.headers.get('x-forwarded-proto') || 'https').split(',')[0].trim();
  const origin = fwdHost && !fwdHost.includes('localhost') && !fwdHost.includes('0.0.0.0')
    ? `${fwdProto}://${fwdHost}`
    : (process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin);

  const res = NextResponse.redirect(new URL('/serveur/login', origin), 303);
  res.cookies.set(ACCESS_TOKEN_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 });
  return res;
}
