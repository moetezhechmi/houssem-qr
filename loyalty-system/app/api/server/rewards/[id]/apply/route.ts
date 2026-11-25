import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { apiError, requireEmployeeUser } from '@/lib/api-guard';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const employee = await requireEmployeeUser('server');
  if (!employee) return apiError(401, 'UNAUTHORIZED', 'Non connecté');
  const { id } = await ctx.params;

  const admin = getAdminClient();

  if (employee.role !== 'super_admin' && employee.store_id) {
    const { data: rewardRow } = await admin
      .from('Rewards')
      .select('store_id')
      .eq('id', id)
      .maybeSingle();

    if (rewardRow && rewardRow.store_id && rewardRow.store_id !== employee.store_id) {
      return apiError(403, 'FORBIDDEN', 'Cette récompense appartient à un autre établissement');
    }
  }

  const { data, error } = await admin.rpc('fn_apply_reward', {
    p_reward_id: id,
    p_employee_id: employee.id,
  });

  if (error) {
    const isExpired = error.message.includes('REWARD_EXPIRED');
    const isNotFound = error.message.includes('REWARD_NOT_FOUND') || error.message.includes('REWARD_NOT_AVAILABLE');
    return apiError(
      isExpired || isNotFound ? 409 : 400,
      isExpired ? 'REWARD_EXPIRED' : isNotFound ? 'REWARD_NOT_FOUND' : 'ERROR',
      isExpired ? 'Récompense expirée' : isNotFound ? 'Récompense introuvable ou déjà utilisée' : error.message
    );
  }

  return NextResponse.json(data);
}
