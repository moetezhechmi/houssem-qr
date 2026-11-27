import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { apiError, requireEmployeeUser } from '@/lib/api-guard';
import { getSettings } from '@/lib/server-data';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const employee = await requireEmployeeUser('server');
  if (!employee) return apiError(401, 'UNAUTHORIZED', 'Non connecté');
  const { id } = await ctx.params;

  const admin = getAdminClient();
  const now = new Date();
  const nowIso = now.toISOString();

  // 1. Charger la récompense
  const { data: rewardRow } = await admin
    .from('Rewards')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (!rewardRow) {
    return apiError(409, 'REWARD_NOT_FOUND', 'Récompense introuvable ou déjà utilisée');
  }

  // 2. Vérifier l'appartenance au store
  if (
    employee.role !== 'super_admin' &&
    employee.store_id &&
    rewardRow.store_id &&
    rewardRow.store_id !== employee.store_id
  ) {
    return apiError(403, 'FORBIDDEN', 'Cette récompense appartient à un autre établissement');
  }

  if (rewardRow.status !== 'available') {
    return apiError(409, 'REWARD_NOT_FOUND', 'Récompense introuvable ou déjà utilisée');
  }

  if (new Date(rewardRow.expires_at).getTime() <= now.getTime()) {
    return apiError(409, 'REWARD_EXPIRED', 'Récompense expirée');
  }

  // 3. Récupérer la carte et le cycle liés
  const { data: cycleRow } = await admin
    .from('LoyaltyCycles')
    .select('card_id, store_id')
    .eq('id', rewardRow.cycle_id)
    .maybeSingle();

  const cardId = cycleRow?.card_id;
  const storeId = rewardRow.store_id || cycleRow?.store_id || employee.store_id || null;

  let cardStatusBefore = 'unknown';
  if (cardId) {
    const { data: cardRow } = await admin
      .from('LoyaltyCards')
      .select('status')
      .eq('id', cardId)
      .maybeSingle();
    if (cardRow?.status) cardStatusBefore = cardRow.status;
  }

  // 4. Marquer la récompense utilisée
  const { error: rewardErr } = await admin
    .from('Rewards')
    .update({
      status: 'used',
      used_at: nowIso,
      used_by_employee_id: employee.id,
    })
    .eq('id', rewardRow.id)
    .eq('status', 'available');

  if (rewardErr) {
    return apiError(400, 'REWARD_UPDATE_FAILED', rewardErr.message);
  }

  // 5. Clôturer le cycle terminé
  await admin
    .from('LoyaltyCycles')
    .update({ status: 'completed', completed_at: nowIso })
    .eq('id', rewardRow.cycle_id);

  // 6. Démarrer un nouveau cycle avec les paramètres du store
  const settings = await getSettings(storeId);
  const cardValidityDays = Number(settings?.card_validity_days ?? 30);
  const requiredConsumptions = Number(settings?.required_consumptions ?? 9);
  const newExpiresIso = new Date(now.getTime() + cardValidityDays * 24 * 60 * 60 * 1000).toISOString();

  let newCycleId: string | null = null;
  if (cardId) {
    const { data: newCycle, error: newCycleErr } = await admin
      .from('LoyaltyCycles')
      .insert({
        customer_id: rewardRow.customer_id,
        card_id: cardId,
        store_id: storeId,
        required_consumptions: requiredConsumptions,
        current_consumptions: 0,
        status: 'active',
        started_at: nowIso,
        expires_at: newExpiresIso,
      })
      .select('id')
      .single();

    if (newCycleErr) {
      return apiError(400, 'NEW_CYCLE_FAILED', newCycleErr.message);
    }
    newCycleId = newCycle.id;

    await admin
      .from('LoyaltyCards')
      .update({
        status: 'active',
        start_date: nowIso,
        expiration_date: newExpiresIso,
      })
      .eq('id', cardId);
  }

  // 7. Audit log
  try {
    await admin.from('AuditLogs').insert({
      employee_id: employee.id,
      store_id: storeId,
      action: 'apply_reward',
      entity_type: 'Rewards',
      entity_id: rewardRow.id,
      details: {
        discount_percentage: rewardRow.discount_percentage,
        card_status_before: cardStatusBefore,
      },
    });
  } catch {}

  return NextResponse.json({
    reward: {
      id: rewardRow.id,
      status: 'used',
      discount_percentage: rewardRow.discount_percentage,
    },
    new_cycle: newCycleId
      ? {
          id: newCycleId,
          current_consumptions: 0,
          required_consumptions: requiredConsumptions,
          expires_at: newExpiresIso,
        }
      : null,
  });
}
