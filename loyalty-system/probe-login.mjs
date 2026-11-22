const SUPABASE = 'https://nherdvalokgjjmpvpsyr.supabase.co';
const KEY = 'sb_publishable_6RRO_F9ds0p1AnlDl8uH1w_qe4ZIwjA';
const EMAIL = 'admin@bieny.test';
const PASSWORD = '123456';

// 1) Sign-in direct Supabase (GoTrue)
{
  const r = await fetch(`${SUPABASE}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const text = await r.text();
  console.log('[supabase sign-in]', r.status);
  console.log('  access_token:', text.includes('access_token') ? '(présent)' : '(absent)');
  const j = text.length < 800 ? JSON.parse(text) : null;
  if (j) console.log('  user.id:', j.user?.id, 'aud:', j.user?.aud, 'role:', j.user?.app_metadata?.role ?? j.user?.raw_user_meta_data?.role);
  else console.log('  raw:', text.slice(0, 300));
}

// 2) Login route Next.js
{
  const r = await fetch('http://localhost:3100/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  console.log('[next /api/auth/login]', r.status);
  const body = await r.text();
  console.log('  body:', body.slice(0, 300));
  const setCookies = [...r.headers.entries()].filter(([k]) => k === 'set-cookie').map(([, v]) => v.slice(0, 90));
  console.log('  set-cookie:', setCookies.length ? setCookies : '(aucun)');
}

// 3) GET /serveur (no redirect following)
{
  const r = await fetch('http://localhost:3100/serveur', { redirect: 'manual' });
  console.log('[GET /serveur]', r.status, r.headers.get('location') ? `-> ${r.headers.get('location')}` : '');
}
