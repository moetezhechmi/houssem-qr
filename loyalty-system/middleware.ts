import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const protectedPath = pathname.startsWith('/serveur') && pathname !== '/serveur/login'
    || pathname.startsWith('/admin');
  if (protectedPath) {
    const token = req.cookies.get('sb_access_token')?.value;
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = '/serveur/login';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/serveur/:path*', '/admin/:path*'],
};