import { NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/auth-guard';
import { invokeEdge } from '@/lib/supabase';
import { apiError, requireEmployeeUser } from '@/lib/api-guard';

export async function POST() {
  if (!(await requireEmployeeUser('server'))) return apiError(401, 'UNAUTHORIZED', 'Non connecté');
  const accessToken = (await getAccessToken()) ?? undefined;
  const r = await invokeEdge('expire-jobs', {}, { accessToken });
  if (!r.ok) return apiError(500, r.error.code, r.error.message);
  return NextResponse.json(r.data);
}
