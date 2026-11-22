import fs from 'node:fs';

const envContent = fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const env = {};
envContent.split('\n').forEach(l => {
  const m = l.match(/^\s*([A-Za-z0-9_]+)\s*=\s*['"]?(.*?)['"]?\s*$/);
  if (m) env[m[1]] = m[2];
});
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Test: mettre une date passée et lancer expire_jobs
const cardId = '06e36c10-0d65-4c5a-a06d-88e4fb8c57db'; // la carte du premier test

// 1. Lire le statut actuel de la carte
const r1 = await fetch(`${url}/rest/v1/LoyaltyCards?id=eq.${cardId}`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` }
});
console.log('Carte actuelle:', await r1.json());

// 2. Update direct via RLS → va échouer si RLS bloque
const r2 = await fetch(`${url}/rest/v1/LoyaltyCards?id=eq.${cardId}`, {
  method: 'PATCH',
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal'
  },
  body: JSON.stringify({ expiration_date: '2020-01-01T00:00:00Z' })
});
console.log('Update expiration_date status (attendu: 204 ou 400):', r2.status, await r2.text());
