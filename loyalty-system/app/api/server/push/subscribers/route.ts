import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { apiError, requireEmployeeUser } from '@/lib/api-guard';

export async function GET() {
  if (!(await requireEmployeeUser('admin'))) return apiError(401, 'UNAUTHORIZED', 'Non connecté');
  const admin = getAdminClient();
  const { count, error } = await admin.from('PushSubscriptions').select('id', { count: 'exact', head: true }).eq('is_active', true);
  if (error) return apiError(500, 'FETCH_FAILED', error.message);
  return NextResponse.json({ count: count ?? 0 });
}