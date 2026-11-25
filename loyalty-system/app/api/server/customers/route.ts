import { NextResponse } from 'next/server';
import { createHash, randomUUID } from 'crypto';
import { getAdminClient } from '@/lib/supabase';
import { apiError, requireEmployeeUser } from '@/lib/api-guard';
import { getSearchCustomers, getSettings } from '@/lib/server-data';

export async function GET(req: Request) {
  const employee = await requireEmployeeUser('server');
  if (!employee) return apiError(401, 'UNAUTHORIZED', 'Non connecté');
  const q = new URL(req.url).searchParams.get('q') ?? '';
  try {
    return NextResponse.json(await getSearchCustomers(q, employee.store_id));
  } catch (e: any) {
    return apiError(500, 'INTERNAL_ERROR', e.message);
  }
}

export async function POST(req: Request) {
  const employee = await requireEmployeeUser('server');
  if (!employee) return apiError(401, 'UNAUTHORIZED', 'Non connecté');

  const body = await req.json().catch(() => ({}));
  const firstName = String(body?.first_name ?? '').trim();
  const lastName = String(body?.last_name ?? '').trim();
  const phone = String(body?.phone ?? '').trim();

  if (!firstName || !lastName || !phone) {
    return apiError(400, 'EMPTY_FIELDS', 'Nom, prénom et téléphone obligatoires.');
  }

  const admin = getAdminClient();
  const storeId = employee.store_id || null;

  // 1. Vérifier unicité du téléphone STRICTEMENT dans le même store
  let dupQuery = admin.from('Customers').select('id').eq('phone', phone);
  if (storeId) {
    dupQuery = dupQuery.eq('store_id', storeId);
  } else {
    dupQuery = dupQuery.is('store_id', null);
  }
  const { data: existingCust } = await dupQuery.maybeSingle();
  if (existingCust) {
    return apiError(409, 'PHONE_DUPLICATE', 'Ce numéro de téléphone existe déjà dans votre établissement');
  }

  // 2. Charger les règles de fidélité propres à ce store
  const settings = await getSettings(storeId);
  const validityDays = Number(settings?.card_validity_days ?? 30);
  const requiredConsumptions = Number(settings?.required_consumptions ?? 9);

  // 3. Créer le client rattaché au store
  const { data: customer, error: custErr } = await admin
    .from('Customers')
    .insert({
      first_name: firstName,
      last_name: lastName,
      phone,
      store_id: storeId,
    })
    .select('id, first_name, last_name, phone')
    .single();

  if (custErr || !customer) {
    const isDup = custErr?.code === '23505';
    return apiError(isDup ? 409 : 400, isDup ? 'PHONE_DUPLICATE' : 'CREATE_FAILED', isDup ? 'Ce numéro de téléphone existe déjà' : (custErr?.message ?? 'Erreur création client'));
  }

  // 4. Créer la carte et le cycle rattachés au store avec les paramètres du store
  const publicToken = `lc_${randomUUID().replace(/-/g, '')}${randomUUID().replace(/-/g, '')}`;
  const tokenHash = createHash('sha256').update(publicToken, 'utf8').digest('hex');
  const cardNumber = `CLI-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  const now = new Date();
  const expirationDate = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000);

  const { data: card, error: cardErr } = await admin
    .from('LoyaltyCards')
    .insert({
      customer_id: customer.id,
      store_id: storeId,
      card_number: cardNumber,
      public_token: publicToken,
      token_hash: tokenHash,
      start_date: now.toISOString(),
      expiration_date: expirationDate.toISOString(),
      status: 'active',
    })
    .select('id, card_number, public_token, status, start_date, expiration_date')
    .single();

  if (cardErr || !card) {
    return apiError(500, 'CARD_CREATE_FAILED', cardErr?.message ?? 'Erreur création carte');
  }

  const { error: cycleErr } = await admin.from('LoyaltyCycles').insert({
    customer_id: customer.id,
    card_id: card.id,
    store_id: storeId,
    required_consumptions: requiredConsumptions,
    current_consumptions: 0,
    status: 'active',
    started_at: now.toISOString(),
    expires_at: expirationDate.toISOString(),
  });

  if (cycleErr) {
    return apiError(500, 'CYCLE_CREATE_FAILED', cycleErr.message);
  }

  // 5. Log d'audit rattaché au store
  try {
    await admin.from('AuditLogs').insert({
      employee_id: employee.id,
      store_id: storeId,
      action: 'create_customer',
      entity_type: 'Customers',
      entity_id: customer.id,
      details: { phone, card_number: cardNumber, link: `/client/${publicToken}` },
    });
  } catch {}

  return NextResponse.json(
    {
      customer,
      card,
      link: `/client/${publicToken}`,
    },
    { status: 201 }
  );
}
