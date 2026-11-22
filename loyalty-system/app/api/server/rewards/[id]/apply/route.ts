import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { apiError, requireEmployeeUser } from '@/lib/api-guard';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const employee = await requireEmployeeUser('server');
  if (!employee) return apiError(401, 'UNAUTHORIZED', 'Non connecté');
  const { id } = await ctx.params;

  const { data, error } = await getAdminClient().rpc('fn_apply_reward', {
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
