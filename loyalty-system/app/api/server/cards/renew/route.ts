import { NextResponse } from 'next/server';
import { createHash, randomUUID } from 'crypto';
import { getAdminClient } from '@/lib/supabase';
import { apiError, requireEmployeeUser } from '@/lib/api-guard';
import { getSettings } from '@/lib/server-data';

export async function POST(req: Request) {
  const employee = await requireEmployeeUser('server');
  if (!employee) return apiError(401, 'UNAUTHORIZED', 'Non connecté');

  const body = await req.json().catch(() => ({}));
  const customerId = body?.customer_id;
  if (!customerId) return apiError(400, 'CUSTOMER_ID_REQUIRED', 'ID du client requis.');

  const admin = getAdminClient();

  // 1. Vérifier que le client existe et appartient au store de l'employé
  const { data: customer, error: custErr } = await admin
    .from('Customers')
    .select('id, store_id')
    .eq('id', customerId)
    .maybeSingle();

  if (custErr || !customer) {
    return apiError(404, 'CUSTOMER_NOT_FOUND', 'Client introuvable.');
  }

  if (employee.role !== 'super_admin' && employee.store_id && customer.store_id !== employee.store_id) {
    return apiError(403, 'FORBIDDEN', 'Ce client appartient à un autre établissement.');
  }

  const storeId = customer.store_id || employee.store_id || null;
  const now = new Date();

  // 2. Vérifier qu'aucune carte active non expirée n'est déjà en cours
  const { data: activeCards } = await admin
    .from('LoyaltyCards')
    .select('id, expiration_date')
    .eq('customer_id', customerId)
    .eq('status', 'active');

  const stillValid = (activeCards ?? []).some((c) => new Date(c.expiration_date).getTime() > now.getTime());
  if (stillValid) {
    return apiError(409, 'CARD_ALREADY_ACTIVE', 'Une carte active et valide existe déjà pour ce client.');
  }

  // 3. Archiver les anciennes cartes expirées
  await admin
    .from('LoyaltyCards')
    .update({ status: 'archived' })
    .eq('customer_id', customerId)
    .in('status', ['active', 'expired']);

  // 4. Charger les paramètres du store
  const settings = await getSettings(storeId);
  const validityDays = Number(settings?.card_validity_days ?? 30);
  const requiredConsumptions = Number(settings?.required_consumptions ?? 9);

  // 5. Créer la nouvelle carte & le nouveau cycle avec le store_id
  const publicToken = `lc_${randomUUID().replace(/-/g, '')}${randomUUID().replace(/-/g, '')}`;
  const tokenHash = createHash('sha256').update(publicToken, 'utf8').digest('hex');
  const cardNumber = `CLI-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  const expirationDate = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000);

  const { data: card, error: cardErr } = await admin
    .from('LoyaltyCards')
    .insert({
      customer_id: customerId,
      store_id: storeId,
      card_number: cardNumber,
      public_token: publicToken,
      token_hash: tokenHash,
      start_date: now.toISOString(),
      expiration_date: expirationDate.toISOString(),
      status: 'active',
    })
    .select('id, card_number, status, start_date, expiration_date')
    .single();

  if (cardErr || !card) {
    return apiError(400, 'RENEW_FAILED', cardErr?.message ?? 'Erreur renouvellement');
  }

  const { error: cycleErr } = await admin.from('LoyaltyCycles').insert({
    customer_id: customerId,
    card_id: card.id,
    store_id: storeId,
    required_consumptions: requiredConsumptions,
    current_consumptions: 0,
    status: 'active',
    started_at: now.toISOString(),
    expires_at: expirationDate.toISOString(),
  });

  if (cycleErr) {
    return apiError(400, 'RENEW_FAILED', cycleErr.message);
  }

  try {
    await admin.from('AuditLogs').insert({
      employee_id: employee.id,
      store_id: storeId,
      action: 'renew_card',
      entity_type: 'LoyaltyCards',
      entity_id: card.id,
      details: { card_number: card.card_number, link: `/client/${publicToken}` },
    });
  } catch {}

  return NextResponse.json({ card });
}
