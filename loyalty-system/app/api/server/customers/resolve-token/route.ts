import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { getClient } from '@/lib/supabase';
import { apiError, requireEmployeeUser } from '@/lib/api-guard';

export async function POST(req: Request) {
  if (!(await requireEmployeeUser('server'))) return apiError(401, 'UNAUTHORIZED', 'Non connecté');
  const body = await req.json().catch(() => ({}));
  const token = String(body?.token ?? '').trim();
  if (!token) return apiError(400, 'INVALID_INPUT', 'Token requis');

  const tokenHash = createHash('sha256').update(token, 'utf8').digest('hex');
  const { data, error } = await getClient().rpc('fn_get_client_card', { p_token_hash: tokenHash });

  if (error) return apiError(500, 'FETCH_FAILED', error.message);
  if (!data?.customer?.id) return apiError(404, 'CARD_NOT_FOUND', 'Carte introuvable');

  return NextResponse.json({ customer_id: data.customer.id });
}