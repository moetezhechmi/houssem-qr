import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const storeSlug = searchParams.get('store');
  const storeId = searchParams.get('store_id');

  let store: any = null;

  if (storeSlug || storeId) {
    let q = getAdminClient().from('Stores').select('name, slug, logo_url');
    if (storeSlug) q = q.eq('slug', storeSlug);
    else if (storeId) q = q.eq('id', storeId);
    const { data } = await q.maybeSingle();
    store = data;
  }

  const appName = store?.name || 'Bieny Coffeeshop';
  const shortName = store?.name ? store.name.substring(0, 15) : 'Bieny';
  const logo = store?.logo_url || '/logo_houssem.jpeg';

  const manifest = {
    name: appName,
    short_name: shortName,
    description: `Votre carte de fidélité ${appName}`,
    start_url: store?.slug ? `/?store=${store.slug}` : '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FAF9F6',
    theme_color: '#8FAF9A',
    icons: [
      {
        src: logo,
        sizes: '192x192',
        type: logo.endsWith('.png') ? 'image/png' : logo.endsWith('.svg') ? 'image/svg+xml' : 'image/jpeg',
        purpose: 'any',
      },
      {
        src: logo,
        sizes: '512x512',
        type: logo.endsWith('.png') ? 'image/png' : logo.endsWith('.svg') ? 'image/svg+xml' : 'image/jpeg',
        purpose: 'any',
      },
      {
        src: logo,
        sizes: 'any',
        type: logo.endsWith('.png') ? 'image/png' : logo.endsWith('.svg') ? 'image/svg+xml' : 'image/jpeg',
        purpose: 'maskable',
      },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': 'public, max-age=60, s-maxage=3600',
    },
  });
}
