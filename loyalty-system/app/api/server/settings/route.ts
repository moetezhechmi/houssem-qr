import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { apiError, requireEmployeeUser } from '@/lib/api-guard';
import { getSettings } from '@/lib/server-data';

export async function GET() {
  const admin = await requireEmployeeUser('admin');
  if (!admin) return apiError(401, 'UNAUTHORIZED', 'Non connecté');
  return NextResponse.json(await getSettings(admin.store_id));
}

export async function PUT(req: Request) {
  const admin = await requireEmployeeUser('admin');
  if (!admin) return apiError(401, 'UNAUTHORIZED', 'Non connecté');
  const body = await req.json().catch(() => ({}));

  // Direct update of ProgramSettings table to bypass the stored procedure
  // fn_update_settings bug: passing integer 1 into AuditLogs.entity_id (UUID)
  const updatePayload: Record<string, any> = {
    updated_at: new Date().toISOString(),
    updated_by: admin.id,
  };

  if (body.required_consumptions !== undefined && body.required_consumptions !== null) {
    updatePayload.required_consumptions = Number(body.required_consumptions);
  }
  if (body.discount_percentage !== undefined && body.discount_percentage !== null) {
    updatePayload.discount_percentage = Number(body.discount_percentage);
  }
  if (body.card_validity_days !== undefined && body.card_validity_days !== null) {
    updatePayload.card_validity_days = Number(body.card_validity_days);
  }
  if (body.reward_validity_days !== undefined && body.reward_validity_days !== null) {
    updatePayload.reward_validity_days = Number(body.reward_validity_days);
  }

  const supabase = getAdminClient();
  let updated: any = null;
  let updateError: any = null;

  if (admin.store_id) {
    const { data: existing } = await supabase
      .from('ProgramSettings')
      .select('store_id')
      .eq('store_id', admin.store_id)
      .maybeSingle();

    if (existing) {
      const res = await supabase
        .from('ProgramSettings')
        .update(updatePayload)
        .eq('store_id', admin.store_id)
        .select()
        .single();
      updated = res.data;
      updateError = res.error;
    } else {
      const res = await supabase
        .from('ProgramSettings')
        .insert({
          store_id: admin.store_id,
          required_consumptions: updatePayload.required_consumptions ?? 9,
          discount_percentage: updatePayload.discount_percentage ?? 30,
          card_validity_days: updatePayload.card_validity_days ?? 30,
          reward_validity_days: updatePayload.reward_validity_days ?? 7,
          updated_at: updatePayload.updated_at,
          updated_by: updatePayload.updated_by,
        })
        .select()
        .single();
      updated = res.data;
      updateError = res.error;
    }
  } else {
    const res = await supabase
      .from('ProgramSettings')
      .update(updatePayload)
      .eq('id', 1)
      .select()
      .single();
    updated = res.data;
    updateError = res.error;
  }

  if (updateError || !updated) {
    return apiError(400, 'UPDATE_FAILED', updateError?.message ?? 'Erreur mise à jour paramètres');
  }

  // Audit log with entity_id: null (avoids UUID vs INT constraint failure)
  try {
    await supabase.from('AuditLogs').insert({
      employee_id: admin.id,
      store_id: admin.store_id || null,
      action: 'update_settings',
      entity_type: 'ProgramSettings',
      entity_id: null,
      details: {
        required_consumptions: updated.required_consumptions,
        discount_percentage: updated.discount_percentage,
        card_validity_days: updated.card_validity_days,
        reward_validity_days: updated.reward_validity_days,
      },
    });
  } catch (auditErr) {
    console.error('AuditLog insert failed:', auditErr);
  }

  return NextResponse.json(updated);
}
