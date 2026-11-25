import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { getEmployee } from '@/lib/auth-guard';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentEmp = await getEmployee('super_admin');
    if (!currentEmp) {
      return NextResponse.json({ error: 'Accès réservé au Super Admin' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { status, logo_url, name, phone, address } = body;

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (status) {
      if (!['active', 'suspended', 'trial', 'archived'].includes(status)) {
        return NextResponse.json({ error: 'Statut invalide' }, { status: 400 });
      }
      updatePayload.status = status;
    }

    if (logo_url !== undefined) updatePayload.logo_url = logo_url?.trim() || null;
    if (name !== undefined) updatePayload.name = name.trim();
    if (phone !== undefined) updatePayload.phone = phone.trim() || null;
    if (address !== undefined) updatePayload.address = address.trim() || null;

    const adminClient = getAdminClient();
    const { data: updated, error } = await adminClient
      .from('Stores')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, store: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
