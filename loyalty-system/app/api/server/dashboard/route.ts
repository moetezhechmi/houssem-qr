import { NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/auth-guard';
import { invokeEdge } from '@/lib/supabase';
import { apiError, requireEmployeeUser } from '@/lib/api-guard';
import { getDashboardStats } from '@/lib/server-data';

export async function GET() {
  const employee = await requireEmployeeUser('server');
  if (!employee) return apiError(401, 'UNAUTHORIZED', 'Non connecté');
  try {
    return NextResponse.json(await getDashboardStats(employee.store_id));
  } catch (e: any) {
    return apiError(500, 'INTERNAL_ERROR', e.message);
  }
}
