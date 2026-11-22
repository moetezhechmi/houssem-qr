import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { apiError, requireEmployeeUser } from '@/lib/api-guard';

export async function GET() {
  if (!(await requireEmployeeUser('admin'))) return apiError(401, 'UNAUTHORIZED', 'Non connecté');
  const { data, error } = await getAdminClient().from('AuditLogs').select('*').order('created_at.desc').limit(50);
  if (error) return apiError(500, 'AUDIT_ERROR', error.message);
  return NextResponse.json(data ?? []);
}
