import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getAdminClient, invokeEdge } from '@/lib/supabase';
import { apiError, requireEmployeeUser } from '@/lib/api-guard';
import { getSettings } from '@/lib/server-data';

export async function POST(req: Request) {
  const employee = await requireEmployeeUser('server');
  if (!employee) return apiError(401, 'UNAUTHORIZED', 'Non connecté');
  const body = await req.json().catch(() => ({}));
  if (!body?.card_id) return apiError(400, 'CARD_ID_REQUIRED', 'ID de la carte requis.');

  const admin = getAdminClient();
  const now = new Date();
  const nowIso = now.toISOString();

  // 1. Charger la carte et vérifier l'appartenance au store
  const { data: cardRow } = await admin
    .from('LoyaltyCards')
    .select('id, store_id, customer_id, status, expiration_date')
    .eq('id', body.card_id)
    .maybeSingle();

  if (!cardRow) {
    return apiError(404, 'CARD_NOT_FOUND', 'Carte introuvable');
  }

  if (
    employee.role !== 'super_admin' &&
    employee.store_id &&
    cardRow.store_id &&
    cardRow.store_id !== employee.store_id
  ) {
    return apiError(403, 'FORBIDDEN', 'Cette carte appartient à un autre établissement');
  }

  // 2. Vérifier que la carte est active et non expirée
  if (cardRow.status !== 'active' || new Date(cardRow.expiration_date).getTime() <= now.getTime()) {
    return apiError(409, 'CARTE_EXPIRED', 'Carte ou cycle expiré');
  }

  // 3. Charger le cycle actif de cette carte
  const { data: cycle } = await admin
    .from('LoyaltyCycles')
    .select('*')
    .eq('card_id', cardRow.id)
    .eq('status', 'active')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!cycle || new Date(cycle.expires_at).getTime() <= now.getTime()) {
    return apiError(409, 'CARTE_EXPIRED', 'Carte ou cycle expiré');
  }

  // 4. Vérifier qu'aucune récompense n'est déjà en attente sur ce cycle
  const { data: pendingReward } = await admin
    .from('Rewards')
    .select('id, expires_at')
    .eq('cycle_id', cycle.id)
    .eq('status', 'available')
    .gt('expires_at', nowIso)
    .limit(1)
    .maybeSingle();

  if (pendingReward || cycle.current_consumptions >= cycle.required_consumptions) {
    return apiError(409, 'REWARD_PENDING', 'Une récompense est en attente d’utilisation');
  }

  const storeId = cardRow.store_id || employee.store_id || null;
  const txRef = `TRX-${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`;

  // 5. Enregistrer la transaction de consommation
  const { data: txRow, error: txErr } = await admin
    .from('ConsumptionTransactions')
    .insert({
      cycle_id: cycle.id,
      customer_id: cycle.customer_id,
      employee_id: employee.id,
      store_id: storeId,
      transaction_reference: txRef,
      status: 'recorded',
    })
    .select('id')
    .single();

  if (txErr || !txRow) {
    return apiError(400, 'TX_FAILED', txErr?.message ?? 'Erreur lors de l’enregistrement');
  }

  // 6. Incrémenter le compteur du cycle
  const newCount = cycle.current_consumptions + 1;
  const { error: cycleUpdateErr } = await admin
    .from('LoyaltyCycles')
    .update({ current_consumptions: newCount })
    .eq('id', cycle.id);

  if (cycleUpdateErr) {
    return apiError(400, 'CYCLE_UPDATE_FAILED', cycleUpdateErr.message);
  }

  // 7. Si objectif atteint, débloquer la récompense avec les règles du store
  let unlockedRewardId: string | null = null;
  if (newCount >= cycle.required_consumptions) {
    const { data: existingReward } = await admin
      .from('Rewards')
      .select('id')
      .eq('cycle_id', cycle.id)
      .eq('status', 'available')
      .limit(1)
      .maybeSingle();

    if (!existingReward) {
      const settings = await getSettings(storeId);
      const discountPct = Number(settings?.discount_percentage ?? 30);
      const rewardValidityDays = Number(settings?.reward_validity_days ?? 7);
      const rewardExpiresAt = new Date(now.getTime() + rewardValidityDays * 24 * 60 * 60 * 1000).toISOString();

      const { data: rewardRow } = await admin
        .from('Rewards')
        .insert({
          customer_id: cycle.customer_id,
          cycle_id: cycle.id,
          store_id: storeId,
          discount_percentage: discountPct,
          status: 'available',
          unlocked_at: nowIso,
          expires_at: rewardExpiresAt,
        })
        .select('id')
        .maybeSingle();

      if (rewardRow?.id) {
        unlockedRewardId = rewardRow.id;
        try {
          await admin.from('AuditLogs').insert({
            employee_id: employee.id,
            store_id: storeId,
            action: 'unlock_reward',
            entity_type: 'Rewards',
            entity_id: unlockedRewardId,
            details: { cycle_id: cycle.id, discount_percentage: discountPct },
          });
        } catch {}
      }
    }
  }

  // 8. Audit log de la consommation
  try {
    await admin.from('AuditLogs').insert({
      employee_id: employee.id,
      store_id: storeId,
      action: 'add_consumption',
      entity_type: 'ConsumptionTransactions',
      entity_id: txRow.id,
      details: {
        card_id: cardRow.id,
        cycle_id: cycle.id,
        current_consumptions: newCount,
        required_consumptions: cycle.required_consumptions,
      },
    });
  } catch {}

  // Trigger push notification if a reward was unlocked (best-effort, non-blocking)
  if (unlockedRewardId) {
    invokeEdge('notify-reward-unlocked', { card_id: body.card_id }, { key: 'service' }).catch(() => null);
  }

  return NextResponse.json({
    transaction_id: txRow.id,
    cycle: {
      id: cycle.id,
      current_consumptions: newCount,
      required_consumptions: cycle.required_consumptions,
    },
    reward_unlocked: unlockedRewardId !== null,
  });
}
