import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { apiError, requireEmployeeUser } from '@/lib/api-guard';

export async function POST(req: Request) {
  const admin = await requireEmployeeUser('admin');
  if (!admin) return apiError(401, 'UNAUTHORIZED', 'Non connecté');
  const body = await req.json().catch(() => ({}));
  if (!body.transaction_id || typeof body.justification !== 'string' || !body.justification.trim()) {
    return apiError(400, 'INVALID_INPUT', 'transaction_id et justification requis');
  }

  const client = getAdminClient();

  if (admin.role !== 'super_admin' && admin.store_id) {
    const { data: txRow } = await client
      .from('ConsumptionTransactions')
      .select('store_id')
      .eq('id', body.transaction_id)
      .maybeSingle();

    if (!txRow || (txRow.store_id && txRow.store_id !== admin.store_id)) {
      return apiError(403, 'FORBIDDEN', 'Transaction rattachée à un autre établissement');
    }
  }

  const { data, error } = await client.rpc('fn_correction', {
    p_transaction_id: body.transaction_id,
    p_justification: body.justification.trim(),
    p_employee_id: admin.id,
  });

  if (error) return apiError(400, 'CORRECTION_FAILED', error.message);
  return NextResponse.json(data);
}
