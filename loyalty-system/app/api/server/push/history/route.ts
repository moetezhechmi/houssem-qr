import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { apiError, requireEmployeeUser } from '@/lib/api-guard';

export async function GET() {
  const adminEmp = await requireEmployeeUser('admin');
  if (!adminEmp) return apiError(401, 'UNAUTHORIZED', 'Non connecté');
  const admin = getAdminClient();

  let query = admin.from('NotificationHistory').select('*').order('sent_at', { ascending: false }).limit(100);

  // Si admin d'un café spécifique, filtrer l'historique de ses clients
  if (adminEmp.store_id) {
    const { data: storeCusts } = await admin
      .from('Customers')
      .select('id')
      .eq('store_id', adminEmp.store_id);

    const custIds = (storeCusts ?? []).map((c) => c.id);
    if (custIds.length === 0) {
      return NextResponse.json([]);
    }
    query = query.in('customer_id', custIds);
  }

  const { data, error } = await query;
  if (error) return apiError(500, 'FETCH_FAILED', error.message);
  return NextResponse.json(data ?? []);
}