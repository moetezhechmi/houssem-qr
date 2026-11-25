import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { apiError, requireEmployeeUser } from '@/lib/api-guard';

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireEmployeeUser('admin');
  if (!admin) return apiError(401, 'UNAUTHORIZED', 'Non connecté');
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  const update: Record<string, unknown> = {};
  if (body?.role === 'admin' || body?.role === 'server') update.role = body.role;
  if (body?.status === 'active' || body?.status === 'disabled') update.status = body.status;

  if (Object.keys(update).length === 0) {
    return apiError(400, 'INVALID_INPUT', 'Aucune modification valide');
  }

  const adminClient = getAdminClient();

  // Vérifier que l'employé cible appartient au même store (sauf super_admin)
  if (admin.role !== 'super_admin' && admin.store_id) {
    const { data: targetEmp } = await adminClient
      .from('Employees')
      .select('store_id')
      .eq('id', id)
      .maybeSingle();

    if (!targetEmp || targetEmp.store_id !== admin.store_id) {
      return apiError(403, 'FORBIDDEN', 'Cet employé n’appartient pas à votre établissement');
    }
  }

  const { data, error } = await adminClient
    .from('Employees')
    .update(update)
    .eq('id', id)
    .select('*')
    .single();

  if (error) return apiError(400, 'UPDATE_EMPLOYEE_FAILED', error.message);

  try {
    await adminClient.from('AuditLogs').insert({
      employee_id: admin.id,
      store_id: admin.store_id || null,
      action: 'update_employee',
      entity_type: 'Employees',
      entity_id: id,
      details: { ...update },
    });
  } catch {
    // ignore
  }

  return NextResponse.json(data);
}