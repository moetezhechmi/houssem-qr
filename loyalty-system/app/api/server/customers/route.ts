import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { apiError, requireEmployeeUser } from '@/lib/api-guard';
import { getSearchCustomers } from '@/lib/server-data';

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
  if (!body?.first_name || !body?.last_name || !body?.phone) {
    return apiError(400, 'EMPTY_FIELDS', 'Nom, prénom et téléphone obligatoires.');
  }

  const { data, error } = await getAdminClient().rpc('fn_create_customer', {
    p_first_name: String(body.first_name).trim(),
    p_last_name: String(body.last_name).trim(),
    p_phone: String(body.phone).trim(),
  });

  if (error) {
    const isDup = error.message.includes('PHONE_DUPLICATE') || error.code === '23505';
    return apiError(isDup ? 409 : 400, isDup ? 'PHONE_DUPLICATE' : 'CREATE_FAILED', isDup ? 'Ce numéro de téléphone existe déjà' : error.message);
  }

  // Si l'employé est rattaché à un store_id, mettre à jour le customer créé
  if (data?.customer?.id && employee.store_id) {
    await getAdminClient()
      .from('Customers')
      .update({ store_id: employee.store_id })
      .eq('id', data.customer.id);

    if (data?.card?.id) {
      await getAdminClient()
        .from('LoyaltyCards')
        .update({ store_id: employee.store_id })
        .eq('id', data.card.id);
    }
  }

  return NextResponse.json(data, { status: 201 });
}
