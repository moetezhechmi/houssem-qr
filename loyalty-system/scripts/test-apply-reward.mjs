import fs from 'node:fs';

const envContent = fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const env = {};
envContent.split('\n').forEach(l => {
  const m = l.match(/^\s*([A-Za-z0-9_]+)\s*=\s*['"]?(.*?)['"]?\s*$/);
  if (m) env[m[1]] = m[2];
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const rewardId = 'e9371144-d61a-40f3-b8a6-91119f38f402';
const employeeId = '8748a0b1-833b-4ac2-87fd-6cd98c155051';

// 1. Appliquer la récompense
const resApply = await fetch(`${url}/rest/v1/rpc/fn_apply_reward`, {
  method: 'POST',
  headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ p_reward_id: rewardId, p_employee_id: employeeId })
});
console.log('fn_apply_reward status:', resApply.status);
const applied = await resApply.json();
console.log('Applied result:', JSON.stringify(applied, null, 2));

// 2. Tenter de réutiliser la même récompense (doit échouer - anti double-usage)
const resReapply = await fetch(`${url}/rest/v1/rpc/fn_apply_reward`, {
  method: 'POST',
  headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ p_reward_id: rewardId, p_employee_id: employeeId })
});
console.log('Reapply status (attendu: erreur 400):', resReapply.status);
console.log('Reapply error:', await resReapply.text());

// 3. Consulter la fiche serveur mise à jour
const resFiche = await fetch(`${url}/rest/v1/rpc/fn_get_serveur_fiche`, {
  method: 'POST',
  headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ p_customer_id: '7d575eaf-a4a9-4b94-9855-cf66e717b3ad' })
});
const fiche = await resFiche.json();
console.log('Nouveau cycle en cours :', fiche.active_cycle);
console.log('Récompenses du client :', fiche.rewards);
