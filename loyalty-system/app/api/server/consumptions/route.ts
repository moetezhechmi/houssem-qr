import { NextResponse } from 'next/server';
import { getAdminClient, invokeEdge } from '@/lib/supabase';
import { apiError, requireEmployeeUser } from '@/lib/api-guard';

export async function POST(req: Request) {
  const employee = await requireEmployeeUser('server');
  if (!employee) return apiError(401, 'UNAUTHORIZED', 'Non connecté');
  const body = await req.json().catch(() => ({}));
  if (!body?.card_id) return apiError(400, 'CARD_ID_REQUIRED', 'ID de la carte requis.');

  const admin = getAdminClient();

  // Vérifier que la carte appartient bien au store de l'employé
  const { data: cardRow } = await admin
    .from('LoyaltyCards')
    .select('store_id, customer_id')
    .eq('id', body.card_id)
    .maybeSingle();

  if (!cardRow) {
    return apiError(404, 'CARD_NOT_FOUND', 'Carte introuvable');
  }

  if (employee.role !== 'super_admin' && employee.store_id && cardRow.store_id !== employee.store_id) {
    return apiError(403, 'FORBIDDEN', 'Cette carte appartient à un autre établissement');
  }

  const { data, error } = await admin.rpc('fn_add_consumption', {
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

  // S'assurer que la transaction / récompense éventuellement créée porte bien le store_id
  const storeId = cardRow.store_id || employee.store_id || null;
  if (storeId) {
    await Promise.all([
      admin.from('ConsumptionTransactions').update({ store_id: storeId }).eq('customer_id', cardRow.customer_id).is('store_id', null),
      admin.from('Rewards').update({ store_id: storeId }).eq('customer_id', cardRow.customer_id).is('store_id', null),
    ]).catch(() => null);
  }

  // Trigger push notification if a reward was unlocked (best-effort, non-blocking)
  invokeEdge('notify-reward-unlocked', { card_id: body.card_id }, { key: 'service' }).catch(() => null);

  return NextResponse.json(data);
}
