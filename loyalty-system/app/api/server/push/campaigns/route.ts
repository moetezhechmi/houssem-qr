import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { apiError, requireEmployeeUser } from '@/lib/api-guard';
import { invokeEdge } from '@/lib/supabase';

export async function GET() {
  if (!(await requireEmployeeUser('admin'))) return apiError(401, 'UNAUTHORIZED', 'Non connecté');
  const admin = getAdminClient();
  const { data, error } = await admin.from('NotificationCampaigns').select('*').order('created_at', { ascending: false }).limit(50);
  if (error) return apiError(500, 'FETCH_FAILED', error.message);
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const employee = await requireEmployeeUser('admin');
  if (!employee) return apiError(401, 'UNAUTHORIZED', 'Non connecté');
  const body = await req.json().catch(() => ({}));
  const title = String(body?.title ?? '').trim();
  const message = String(body?.message ?? '').trim();
  if (!title || !message) return apiError(400, 'INVALID_INPUT', 'Titre et message requis');

  const admin = getAdminClient();
  const immediate = body?.status === 'send_now';

  const { data: camp, error } = await admin.from('NotificationCampaigns').insert({
    title,
    message,
    image_url: body?.image_url ?? null,
    target: body?.target ?? 'all',
    scheduled_at: body?.scheduled_at ?? null,
    status: immediate ? 'sending' : 'scheduled',
    created_by: employee.id,
  }).select('*').single();

  if (error || !camp) return apiError(500, 'CREATE_FAILED', error?.message ?? 'Erreur');

  if (immediate) {
    // fire-and-forget send
    invokeEdge('send-campaign', {
      campaign_id: camp.id,
      btn_text: body?.btn_text,
      btn_action: body?.btn_action,
    }, { key: 'service' }).catch(() => null);
  }

  return NextResponse.json(camp, { status: 201 });
}