import { NextResponse } from 'next/server';
import { invokeEdge } from '@/lib/supabase';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const r = await invokeEdge('push-unsubscribe', body ?? {}, { key: 'anon' });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json(r.data);
}