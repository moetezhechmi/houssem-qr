import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { apiError, requireEmployeeUser } from '@/lib/api-guard';
import { sendStorePushNotification } from '@/lib/push-service';

export async function GET() {
  const adminEmp = await requireEmployeeUser('admin');
  if (!adminEmp) return apiError(401, 'UNAUTHORIZED', 'Non connecté');
  const admin = getAdminClient();
  let query = admin.from('NotificationCampaigns').select('*').order('created_at', { ascending: false }).limit(50);
  if (adminEmp.store_id) {
    query = query.eq('store_id', adminEmp.store_id);
  }
  const { data, error } = await query;
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
    status: immediate ? 'sent' : 'scheduled',
    created_by: employee.id,
    store_id: employee.store_id || null,
  }).select('*').single();

  if (error || !camp) return apiError(500, 'CREATE_FAILED', error?.message ?? 'Erreur');

  let sentCount = 0;
  if (immediate) {
    // Exécution directe et 100% isolée par storeId sur le serveur Next.js
    const pushRes = await sendStorePushNotification({
      storeId: employee.store_id || null,
      target: body?.target ?? 'all',
      title,
      message,
      imageUrl: body?.image_url ?? null,
      btnText: body?.btn_text,
      btnAction: body?.btn_action,
      campaignId: camp.id,
    });
    sentCount = pushRes.sent;
  }

  return NextResponse.json({ ...camp, sent_count: sentCount }, { status: 201 });
}