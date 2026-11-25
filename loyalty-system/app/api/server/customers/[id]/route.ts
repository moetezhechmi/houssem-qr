import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { getFiche } from '@/lib/server-data';
import { apiError, requireEmployeeUser } from '@/lib/api-guard';

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const employee = await requireEmployeeUser('server');
  if (!employee) return apiError(401, 'UNAUTHORIZED', 'Non connecté');
  const { id } = await ctx.params;

  if (employee.role !== 'super_admin' && employee.store_id) {
    const { data: cust } = await getAdminClient()
      .from('Customers')
      .select('store_id')
      .eq('id', id)
      .maybeSingle();

    if (!cust || cust.store_id !== employee.store_id) {
      return apiError(403, 'FORBIDDEN', 'Client rattaché à un autre établissement');
    }
  }

  try {
    return NextResponse.json(await getFiche(id));
  } catch (e: any) {
    return apiError(500, 'INTERNAL_ERROR', e.message);
  }
}
