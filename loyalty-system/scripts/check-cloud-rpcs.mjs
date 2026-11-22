import fs from 'node:fs';

const envContent = fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const env = {};
envContent.split('\n').forEach(l => {
  const m = l.match(/^\s*([A-Za-z0-9_]+)\s*=\s*['"]?(.*?)['"]?\s*$/);
  if (m) env[m[1]] = m[2];
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const rpcs = [
  'fn_dashboard_stats',
  'fn_get_employee_by_id',
  'fn_get_client_card',
  'fn_get_serveur_fiche',
  'fn_create_customer',
  'fn_add_consumption',
  'fn_apply_reward',
  'fn_renew_card',
  'fn_create_employee',
  'fn_update_employee',
  'fn_update_settings',
  'fn_manual_correction',
  'fn_expire_jobs',
  'fn_search_customers'
];

for (const rpc of rpcs) {
  try {
    const res = await fetch(`${url}/rest/v1/rpc/${rpc}`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    const txt = await res.text();
    console.log(`${rpc.padEnd(25)} -> ${res.status} ${txt.slice(0, 100)}`);
  } catch (e) {
    console.log(`${rpc.padEnd(25)} -> ERR: ${e.message}`);
  }
}
