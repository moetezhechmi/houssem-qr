import fs from 'node:fs';

const envContent = fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const env = {};
envContent.split('\n').forEach(l => {
  const m = l.match(/^\s*([A-Za-z0-9_]+)\s*=\s*['"]?(.*?)['"]?\s*$/);
  if (m) env[m[1]] = m[2];
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const functions = [
  'add-consumption',
  'admin-correction',
  'admin-employees-create',
  'admin-employees-update',
  'admin-update-settings',
  'apply-reward',
  'create-customer',
  'expire-jobs',
  'get-client-card',
  'renew-card'
];

for (const fn of functions) {
  try {
    const res = await fetch(`${url}/functions/v1/${fn}`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    const txt = await res.text();
    console.log(`${fn.padEnd(25)} -> ${res.status} ${txt.slice(0, 100)}`);
  } catch (e) {
    console.log(`${fn.padEnd(25)} -> ERR: ${e.message}`);
  }
}
