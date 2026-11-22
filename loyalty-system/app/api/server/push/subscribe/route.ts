import { NextResponse } from 'next/server';
import { invokeEdge } from '@/lib/supabase';
// client-facing proxy (no employee auth required)

// Note: this endpoint is also used by clients (token-based). Allow without employee auth.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const r = await invokeEdge('push-subscribe', body ?? {}, { key: 'anon' });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json(r.data);
}