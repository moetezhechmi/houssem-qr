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
    const { status } = body;

    if (!status || !['active', 'suspended', 'trial', 'archived'].includes(status)) {
      return NextResponse.json({ error: 'Statut invalide' }, { status: 400 });
    }

    const adminClient = getAdminClient();
    const { data: updated, error } = await adminClient
      .from('Stores')
      .update({ status, updated_at: new Date().toISOString() })
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
