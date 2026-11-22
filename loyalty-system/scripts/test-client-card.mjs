import { createHash } from 'crypto';
import fs from 'node:fs';

const envContent = fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const env = {};
envContent.split('\n').forEach(l => {
  const m = l.match(/^\s*([A-Za-z0-9_]+)\s*=\s*['"]?(.*?)['"]?\s*$/);
  if (m) env[m[1]] = m[2];
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const token = 'lc_ebc1b447f3484c9485fadeabde76d92580a839d8caeb4da094f39f7a9139c36b';
const tokenHash = createHash('sha256').update(token, 'utf8').digest('hex');

const res = await fetch(`${url}/rest/v1/rpc/fn_get_client_card`, {
  method: 'POST',
  headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ p_token_hash: tokenHash })
});
console.log('Client card status:', res.status);
const data = await res.json();
console.log('Client card data:', JSON.stringify(data, null, 2));
