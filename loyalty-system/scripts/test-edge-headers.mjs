import fs from 'node:fs';

const envContent = fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const env = {};
envContent.split('\n').forEach(l => {
  const m = l.match(/^\s*([A-Za-z0-9_]+)\s*=\s*['"]?(.*?)['"]?\s*$/);
  if (m) env[m[1]] = m[2];
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// 1. Obtenir un token valide
const r1 = await fetch(`${url}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { apikey: key, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@bieny.test', password: '123456' }),
});
const { access_token } = await r1.json();
console.log('Login OK, access_token length:', access_token?.length);

// 2. Tester l'appel de l'Edge function create-customer avec différentes combinaisons de headers
async function testCombo(desc, apikeyHeader, authHeader) {
  const res = await fetch(`${url}/functions/v1/create-customer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': apikeyHeader,
      'Authorization': authHeader
    },
    body: JSON.stringify({
      first_name: 'Test',
      last_name: 'Client',
      phone: '06' + Math.floor(Math.random() * 1e8).toString().padStart(8, '0')
    })
  });
  console.log(`${desc.padEnd(45)} -> status: ${res.status}`);
  const text = await res.text();
  console.log('  Body:', text.slice(0, 150));
}

await testCombo('Combo 1: apikey=key, Auth=Bearer token', key, `Bearer ${access_token}`);
await testCombo('Combo 2: apikey=key, Auth=bare token', key, access_token);
await testCombo('Combo 3: apikey=token, Auth=Bearer token', access_token, `Bearer ${access_token}`);
await testCombo('Combo 4: apikey=key, Auth=token (no bearer)', key, access_token);
