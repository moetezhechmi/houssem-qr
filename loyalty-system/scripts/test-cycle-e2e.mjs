import fs from 'node:fs';

const envContent = fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const env = {};
envContent.split('\n').forEach(l => {
  const m = l.match(/^\s*([A-Za-z0-9_]+)\s*=\s*['"]?(.*?)['"]?\s*$/);
  if (m) env[m[1]] = m[2];
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const cardId = '06e36c10-0d65-4c5a-a06d-88e4fb8c57db';
const employeeId = '8748a0b1-833b-4ac2-87fd-6cd98c155051';

for (let i = 2; i <= 9; i++) {
  const res = await fetch(`${url}/rest/v1/rpc/fn_add_consumption`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_card_id: cardId, p_employee_id: employeeId })
  });
  const d = await res.json();
  console.log(`Consommation ${i}/9 -> count:`, d.cycle?.current_consumptions, 'Reward unlocked?', d.reward_unlocked);
}

// Vérifier la récompense débloquée
const resRewards = await fetch(`${url}/rest/v1/Rewards?select=*&customer_id=eq.7d575eaf-a4a9-4b94-9855-cf66e717b3ad`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` }
});
const rewards = await resRewards.json();
console.log('Récompense débloquée :', JSON.stringify(rewards, null, 2));

// Vérifier la fiche serveur
const resFiche = await fetch(`${url}/rest/v1/rpc/fn_get_serveur_fiche`, {
  method: 'POST',
  headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ p_customer_id: '7d575eaf-a4a9-4b94-9855-cf66e717b3ad' })
});
console.log('Fiche serveur can_add_consumption:', (await resFiche.json()).can_add_consumption);
