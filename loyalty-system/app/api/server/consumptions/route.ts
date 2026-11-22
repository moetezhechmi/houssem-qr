import { NextResponse } from 'next/server';
import { getAdminClient, invokeEdge } from '@/lib/supabase';
import { apiError, requireEmployeeUser } from '@/lib/api-guard';

export async function POST(req: Request) {
  const employee = await requireEmployeeUser('server');
  if (!employee) return apiError(401, 'UNAUTHORIZED', 'Non connecté');
  const body = await req.json().catch(() => ({}));
  if (!body?.card_id) return apiError(400, 'CARD_ID_REQUIRED', 'ID de la carte requis.');

  const { data, error } = await getAdminClient().rpc('fn_add_consumption', {
    p_card_id: body.card_id,
    p_employee_id: employee.id,
  });

  if (error) {
    const isExpired = error.message.includes('CARTE_EXPIRED');
    const isPending = error.message.includes('REWARD_PENDING');
    return apiError(
      isExpired || isPending ? 409 : 400,
      isExpired ? 'CARTE_EXPIRED' : isPending ? 'REWARD_PENDING' : 'ERROR',
      isExpired ? 'Carte ou cycle expiré' : isPending ? 'Une récompense est en attente d’utilisation' : error.message
    );
  }

  // Trigger push notification if a reward was unlocked (best-effort, non-blocking)
  invokeEdge('notify-reward-unlocked', { card_id: body.card_id }, { key: 'service' }).catch(() => null);

  return NextResponse.json(data);
}
