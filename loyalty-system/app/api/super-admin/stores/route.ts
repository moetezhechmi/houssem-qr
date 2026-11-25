import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { getEmployee } from '@/lib/auth-guard';

export async function POST(req: Request) {
  try {
    const currentEmp = await getEmployee('super_admin');
    if (!currentEmp) {
      return NextResponse.json({ error: 'Accès non autorisé : rôle Super Admin requis' }, { status: 403 });
    }

    const body = await req.json();
    const { name, slug, logo_url, phone, address, adminName, adminEmail, adminPassword } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'Nom et slug du café sont obligatoires' }, { status: 400 });
    }

    const adminClient = getAdminClient();

    // 1. Créer le Store
    const { data: store, error: storeErr } = await adminClient
      .from('Stores')
      .insert({
        name,
        slug: slug.toLowerCase().trim(),
        logo_url: logo_url?.trim() || null,
        phone: phone || null,
        address: address || null,
        status: 'active',
      })
      .select()
      .single();

    if (storeErr) {
      return NextResponse.json({ error: `Erreur création store: ${storeErr.message}` }, { status: 400 });
    }

    // 2. Créer les paramètres par défaut du Store
    await adminClient.from('ProgramSettings').insert({
      store_id: store.id,
      required_consumptions: 9,
      discount_percentage: 30,
      card_validity_days: 30,
      reward_validity_days: 7,
    });

    let adminUser = null;

    // 3. Si des identifiants admin de café sont fournis, créer le compte admin du café
    if (adminEmail && adminPassword) {
      const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: { name: adminName || `Admin ${name}` },
      });

      if (authErr) {
        return NextResponse.json({
          warning: `Store créé, mais échec création compte admin : ${authErr.message}`,
          store,
        }, { status: 201 });
      }

      const userId = authData.user.id;

      // Créer la fiche Employee pour le gérant du store
      await adminClient.from('Employees').upsert({
        id: userId,
        name: adminName || `Admin ${name}`,
        email: adminEmail,
        role: 'admin',
        status: 'active',
        store_id: store.id,
      });

      adminUser = { id: userId, email: adminEmail, name: adminName };
    }

    return NextResponse.json({
      success: true,
      store,
      adminUser,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
