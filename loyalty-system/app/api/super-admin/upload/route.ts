import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { getEmployee } from '@/lib/auth-guard';

export async function POST(req: Request) {
  try {
    const employee = await getEmployee();
    // Autoriser le super_admin, l'email super_admin, ainsi que tout administrateur de café (rôle 'admin')
    const isAuthorized =
      employee &&
      (employee.role === 'super_admin' ||
        employee.role === 'admin' ||
        employee.email === 'grounmoetezhechmi@gmail.com');

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body?.data || !body?.name) {
      return NextResponse.json({ error: 'Fichier invalide ou manquant' }, { status: 400 });
    }

    // Le client envoie une dataURL base64 : "data:image/png;base64,iVBORw..."
    const base64Data = body.data;
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);

    let mimeType = 'image/png';
    let buffer: Buffer;

    if (matches && matches.length === 3) {
      mimeType = matches[1];
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(base64Data, 'base64');
    }

    // Déterminer l'extension
    const origName = String(body.name || 'logo.png');
    const ext = origName.split('.').pop()?.toLowerCase() || 'png';
    const fileName = `logo-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

    const admin = getAdminClient();

    // S'assurer que le bucket public store-logos existe
    const { data: buckets } = await admin.storage.listBuckets();
    if (!buckets?.some((b) => b.name === 'store-logos')) {
      await admin.storage.createBucket('store-logos', { public: true });
    }

    // Uploader le buffer vers Supabase Storage
    const { data, error } = await admin.storage
      .from('store-logos')
      .upload(fileName, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) {
      return NextResponse.json({ error: `Upload échoué : ${error.message}` }, { status: 500 });
    }

    // Obtenir l'URL publique directe
    const { data: publicData } = admin.storage.from('store-logos').getPublicUrl(fileName);

    return NextResponse.json({
      success: true,
      url: publicData.publicUrl,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur interne' }, { status: 500 });
  }
}
