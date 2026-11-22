import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { apiError, requireEmployeeUser } from '@/lib/api-guard';
import { getSettings } from '@/lib/server-data';

export async function GET() {
  if (!(await requireEmployeeUser('admin'))) return apiError(401, 'UNAUTHORIZED', 'Non connecté');
  return NextResponse.json(await getSettings());
}

export async function PUT(req: Request) {
  const admin = await requireEmployeeUser('admin');
  if (!admin) return apiError(401, 'UNAUTHORIZED', 'Non connecté');
  const body = await req.json().catch(() => ({}));

  const { data, error } = await getAdminClient().rpc('fn_update_settings', {
    p_employee_id: admin.id,
    p_required_consumptions: body.required_consumptions ?? null,
    p_discount_percentage: body.discount_percentage ?? null,
    p_card_validity_days: body.card_validity_days ?? null,
    p_reward_validity_days: body.reward_validity_days ?? null,
  });

  if (error) return apiError(400, 'UPDATE_FAILED', error.message);
  return NextResponse.json(data);
}
