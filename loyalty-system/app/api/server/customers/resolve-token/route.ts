import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { getAdminClient } from '@/lib/supabase';
import { apiError, requireEmployeeUser } from '@/lib/api-guard';

export async function POST(req: Request) {
  const employee = await requireEmployeeUser('server');
  if (!employee) return apiError(401, 'UNAUTHORIZED', 'Non connecté');
  const body = await req.json().catch(() => ({}));
  const token = String(body?.token ?? '').trim();
  if (!token) return apiError(400, 'INVALID_INPUT', 'Token requis');

  const tokenHash = createHash('sha256').update(token, 'utf8').digest('hex');
  const admin = getAdminClient();

  const { data: cardRow, error: cardErr } = await admin
    .from('LoyaltyCards')
    .select('customer_id, store_id')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (cardErr) return apiError(500, 'FETCH_FAILED', cardErr.message);
  if (!cardRow?.customer_id) return apiError(404, 'CARD_NOT_FOUND', 'Carte introuvable');

  if (
    employee.role !== 'super_admin' &&
    employee.store_id &&
    cardRow.store_id &&
    cardRow.store_id !== employee.store_id
  ) {
    return apiError(403, 'FORBIDDEN', 'Cette carte appartient à un autre établissement');
  }

  return NextResponse.json({ customer_id: cardRow.customer_id });
}
