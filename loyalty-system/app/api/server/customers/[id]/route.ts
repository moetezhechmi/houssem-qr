import { NextResponse } from 'next/server';
import { getFiche } from '@/lib/server-data';
import { apiError, requireEmployeeUser } from '@/lib/api-guard';

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await requireEmployeeUser('server'))) return apiError(401, 'UNAUTHORIZED', 'Non connecté');
  const { id } = await ctx.params;
  try {
    return NextResponse.json(await getFiche(id));
  } catch (e: any) {
    return apiError(500, 'INTERNAL_ERROR', e.message);
  }
}
