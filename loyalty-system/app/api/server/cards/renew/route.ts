import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { apiError, requireEmployeeUser } from '@/lib/api-guard';

export async function POST(req: Request) {
  const employee = await requireEmployeeUser('server');
  if (!employee) return apiError(401, 'UNAUTHORIZED', 'Non connecté');
  const body = await req.json().catch(() => ({}));
  if (!body?.customer_id) return apiError(400, 'CUSTOMER_ID_REQUIRED', 'ID du client requis.');

  const { data, error } = await getAdminClient().rpc('fn_renew_card', {
    p_customer_id: body.customer_id,
  });

  if (error) {
    return apiError(400, 'RENEW_FAILED', error.message);
  }

  return NextResponse.json(data);
}
