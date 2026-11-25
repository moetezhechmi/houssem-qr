import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { getEmployee } from '@/lib/auth-guard';

export async function POST(req: Request) {
  try {
    const employee = await getEmployee('super_admin');
    if (!employee) {
      return NextResponse.json({ error: 'Accès réservé au Super Admin' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Déterminer l'extension
    const origName = file.name || 'logo.png';
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
        contentType: file.type || 'image/png',
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
