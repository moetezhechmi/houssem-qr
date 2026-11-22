import fs from 'node:fs';

const envContent = fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const env = {};
envContent.split('\n').forEach(l => {
  const m = l.match(/^\s*([A-Za-z0-9_]+)\s*=\s*['"]?(.*?)['"]?\s*$/);
  if (m) env[m[1]] = m[2];
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// 1. Connexion pour obtenir le token JWT de l'employé
const r1 = await fetch(`${url}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { apikey: key, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@bieny.test', password: '123456' }),
});
const { access_token } = await r1.json();

// 2. Appel de fn_create_customer avec Authorization: Bearer <access_token>
const res = await fetch(`${url}/rest/v1/rpc/fn_create_customer`, {
  method: 'POST',
  headers: {
    apikey: key,
    Authorization: `Bearer ${access_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    p_first_name: 'Ahmed',
    p_last_name: 'Test',
    p_phone: '06' + Math.floor(Math.random() * 1e8).toString().padStart(8, '0')
  })
});
console.log('fn_create_customer as authenticated status:', res.status);
console.log('body:', await res.text());
