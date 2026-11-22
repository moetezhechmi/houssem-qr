import fs from 'node:fs';

const envContent = fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const env = {};
envContent.split('\n').forEach(l => {
  const m = l.match(/^\s*([A-Za-z0-9_]+)\s*=\s*['"]?(.*?)['"]?\s*$/);
  if (m) env[m[1]] = m[2];
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

console.log('Connecting to:', url);

const tablesToCheck = [
  'Customers', 'LoyaltyCards', 'LoyaltyCycles', 'Employees',
  'ConsumptionTransactions', 'Rewards', 'AuditLogs', 'ProgramSettings', 'Corrections',
  'customers', 'employees', 'loyalty_cards', 'consumptions', 'rewards', 'loyalty_settings', 'audit_logs'
];

for (const t of tablesToCheck) {
  try {
    const res = await fetch(`${url}/rest/v1/${t}?limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` }
    });
    const txt = await res.text();
    console.log(`${t.padEnd(25)} -> ${res.status} ${res.statusText} (${txt.slice(0, 80)})`);
  } catch (e) {
    console.log(`${t.padEnd(25)} -> ERR: ${e.message}`);
  }
}
