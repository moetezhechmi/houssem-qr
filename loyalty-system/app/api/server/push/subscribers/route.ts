import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { apiError, requireEmployeeUser } from '@/lib/api-guard';

export async function GET() {
  const adminEmp = await requireEmployeeUser('admin');
  if (!adminEmp) return apiError(401, 'UNAUTHORIZED', 'Non connecté');
  const admin = getAdminClient();

  // Si l'admin a un store_id, compter UNIQUEMENT les abonnés de ce store
  if (adminEmp.store_id) {
    const { data: storeCusts } = await admin
      .from('Customers')
      .select('id')
      .eq('store_id', adminEmp.store_id);

    const custIds = (storeCusts ?? []).map((c) => c.id);
    if (custIds.length === 0) {
      return NextResponse.json({ count: 0 });
    }

    const { count, error } = await admin
      .from('PushSubscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .in('customer_id', custIds);

    if (error) return apiError(500, 'FETCH_FAILED', error.message);
    return NextResponse.json({ count: count ?? 0 });
  }

  // Fallback si super admin global
  const { count, error } = await admin
    .from('PushSubscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true);
  if (error) return apiError(500, 'FETCH_FAILED', error.message);
  return NextResponse.json({ count: count ?? 0 });
}