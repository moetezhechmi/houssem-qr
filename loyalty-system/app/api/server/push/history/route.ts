import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { apiError, requireEmployeeUser } from '@/lib/api-guard';

export async function GET() {
  if (!(await requireEmployeeUser('admin'))) return apiError(401, 'UNAUTHORIZED', 'Non connecté');
  const admin = getAdminClient();
  const { data, error } = await admin.from('NotificationHistory').select('*').order('sent_at', { ascending: false }).limit(100);
  if (error) return apiError(500, 'FETCH_FAILED', error.message);
  return NextResponse.json(data ?? []);
}