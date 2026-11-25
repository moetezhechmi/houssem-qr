import { NextResponse } from 'next/server';
import { fetchClientCard } from '@/lib/client-card';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token) {
      return NextResponse.json({ error: 'Token requis' }, { status: 400 });
    }

    const res = await fetchClientCard(token);
    if (!res.ok || !res.data) {
      return NextResponse.json({ error: res.error || 'Carte introuvable' }, { status: 404 });
    }

    return NextResponse.json(res.data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
