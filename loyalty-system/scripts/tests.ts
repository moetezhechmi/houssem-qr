/**
 * Phase 6 — Tests scénario complet + edge cases (Bieny Coffeeshop, Supabase Cloud).
 *
 * Exécution : `npm test` (après avoir créé les tables via migrations/001_schema.sql + 002_seed.sql).
 *
 * Couvre :
 *  1. Création d'un nouveau client (Ahmed)
 *  2. Refus d'un numéro déjà existant
 *  3. Ajout de consommations (1/9 → ... → 9/9)
 *  4. Déblocage d'une récomponse (30 %)
 *  5. Utilisation de la récomponse + nouveau cycle (0/9)
 *  6. Expiration d'une carte (CARTE_EXPIRED)
 *  7. Renouvellement de carte
 *  8. Expiration d'une récomponse expirée (REWARD_EXPIRED)
 *  9. Double utilisation de la récomponse
 * 10. Correction d'erreur (justification + traçabilité)
 * 11. Lecture fiche client ( lecteur seul )
 * 12. Paramètres dynamiques (admin)
 * 13. Recherche clients
 * 14. Tableau de bord
 */

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

// Charger .env.local (Next le charge automatiquement ; tsx ne le fait pas).
function loadEnvFile(file: string) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?([^"]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
loadEnvFile(path.resolve(process.cwd(), '.env.local'));
loadEnvFile(path.resolve(process.cwd(), '.env.server.local'));

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const ADMIN_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? KEY;

const db = createClient(URL!, ADMIN_KEY!);
const results: string[] = [];
let failures = 0;

function ok(cond: unknown, msg: string) {
  if (cond) results.push(`  ✓ ${msg}`);
  else { failures++; results.push(`  ✗ ${msg}`); }
}
function section(t: string) { results.push(`\n${t}`); }

async function rpc<T = any>(fn: string, params: Record<string, unknown> = {}): Promise<T | null> {
  const { data, error } = await db.rpc(fn, params);
  if (error) throw new Error(`${fn}: ${error.message}`);
  return data;
}

async function expectError(fn: () => Promise<unknown>, code: string, msg: string) {
  try {
    const r = await fn();
    ok(false, `${msg} (aucune erreur — got: ${JSON.stringify(r)?.slice(0, 80)})`);
  } catch (e: any) {
    ok(e?.message?.includes(code), `${msg} — erreur attendue [${code}]`);
  }
}

const randomPhone = () => `06${Math.floor(Math.random() * 1e8).toString().padStart(8, '0')}`;

async function main() {
  section('0. Préparation (employé test)');
  const tables = await db.from('Employees').select('id').limit(1);
  if (tables.error) {
    results.push(`\n❌ Tables Supabase non déployées : ${tables.error.message}`);
    results.push('   → Créer les tables dans le Dashboard Supabase → SQL Editor :');
    results.push('      - Coller migrations/001_schema.sql (création des tables, RLS, fonctions SQL)');
    results.push('      - Coller migrations/002_seed.sql (paramètres par défaut)');
    results.push('   → Relancez `npm test`');
    console.log(results.join('\n'));
    process.exit(1);
  }

  const { data: empRows } = await db.from('Employees').select('id, role').limit(1);
  const employeeId = empRows?.[0]?.id ?? (
    (await db.rpc('users_admin_create_user', {
      p_email: `test-${Date.now()}@bieny.test`,
      p_password: 'Test1234!x',
      p_redirect_to: null,
    }).then(async (r) => {
      const id = (r as any)?.id;
      if (!id) throw new Error('users_admin_create_user n’a pas renvoyé d’ID — vérifier la signature RPC dans le Dashboard');
      await db.from('Employees').insert({ id, role: 'server' });
      return id;
    }))
  );
  ok(employeeId, 'Employé test identifié');

  // ── Scénario Ahmed ─────────────────────────────────────────────
  section('1. Création d\'un nouveau client — Ahmed');
  const c = await rpc<any>('fn_create_customer', { p_first_name: 'Ahmed', p_last_name: 'Bousselmi', p_phone: randomPhone() });
  ok(c?.customer?.id, `Client créé (${c.customer.first_name} ${c.customer.last_name})`);
  ok(c?.card?.card_number, `Carte créée : ${c.card.card_number}`);
  ok(c?.link?.startsWith('/client/'), `Lien personnel : ${c.link}`);
  const tokenHash = (await db.from('LoyaltyCards').select('token_hash').eq('card_number', c.card.card_number).single()).data?.token_hash;
  ok(tokenHash, 'Token haché stocké (SHA-256, pas de token en clair dans le lookup client)');

  const fiche = await rpc('fn_get_serveur_fiche', { p_customer_id: c.customer.id });
  ok(fiche?.card?.status === 'active', 'Carte active');
  ok(fiche?.active_cycle?.current_consumptions === 0, 'Compteur à 0/9');

  section('2. Refus d\'un numéro déjà existant');
  await expectError(
    () => rpc('fn_create_customer', { p_first_name: 'X', p_last_name: 'Y', p_phone: c.customer.phone }),
    'PHONE_DUPLICATE',
    'Création avec numéro existant refusée',
  );

  section('3. Ajout de consommations — 8/9');
  for (let i = 0; i < 8; i++) {
    const r = await rpc('fn_add_consumption', { p_card_id: c.card.id, p_employee_id: employeeId });
    if (!r?.transaction_id) ok(false, `Ajout ${i + 1}/9 échoué`);
  }
  const f2 = await rpc('fn_get_serveur_fiche', { p_customer_id: c.customer.id });
  ok(f2?.active_cycle?.current_consumptions === 8, `Compteur à ${f2?.active_cycle?.current_consumptions}/9`);
  ok(!f2?.rewards?.some((r: any) => r.status === 'available'), 'Aucune récomponse débloquée à 8/9');

  section('4. 9/9 — Déblocage de la récomponse (30%)');
  await rpc('fn_add_consumption', { p_card_id: c.card.id, p_employee_id: employeeId });
  const f3 = await rpc('fn_get_serveur_fiche', { p_customer_id: c.customer.id });
  const available = f3?.rewards?.find((r: any) => r.status === 'available');
  ok(f3?.active_cycle?.current_consumptions === 9, 'Compteur à 9/9');
  ok(available?.discount_percentage === 30, 'Récomponse débloquée à 30 %');
  ok(available?.is_expired === false, 'Récomponse disponible (pas expirée)');
  const txCheck = await db.from('ConsumptionTransactions').select('transaction_reference').eq('customer_id', c.customer.id).order('created_at.desc').limit(1);
  ok(txCheck.data?.length === 1 && txCheck.data[0]?.transaction_reference?.startsWith('TRX-'), `Transaction unique enregistrée : ${txCheck.data?.[0]?.transaction_reference}`);

  section('5. Ajout de consommation avec récomponse en attente → REWARD_PENDING');
  await expectError(
    () => rpc('fn_add_consumption', { p_card_id: c.card.id, p_employee_id: employeeId }),
    'REWARD_PENDING',
    'Consommation refusée tant que la récomponse est en attente',
  );

  section('6. Utilisation de la récomponse + nouveau cycle (0/9)');
  const applied = await rpc('fn_apply_reward', { p_reward_id: available.id, p_employee_id: employeeId });
  ok(applied?.reward?.status === 'used', 'Récomponse marquée « utilisée »');
  ok(applied?.new_cycle?.current_consumptions === 0, 'Nouveau cycle à 0/9');
  const f4 = await rpc('fn_get_serveur_fiche', { p_customer_id: c.customer.id });
  ok(f4?.card?.status === 'active', 'Carte active après utilisation');
  const doubleApply = await db.from('Rewards').select('id').eq('id', available.id);
  ok(doubleApply.data?.[0]?.id, 'Récomponse existante conservée');

  // ── Expirations ─────────────────────────────────────────────────
  section('7. Expiration d\'une carte à 5/9 (simulée) → CARTE_EXPIRED');
  // Ajouter 5 consommations sur le nouveau cycle, puis expirer artificially
  for (let i = 0; i < 5; i++) await rpc('fn_add_consumption', { p_card_id: f4.card.id, p_employee_id: employeeId });
  const f5 = await rpc('fn_get_serveur_fiche', { p_customer_id: c.customer.id });
  ok(f5?.active_cycle?.current_consumptions === 5, `5/9 sur le nouveau cycle`);
  await db.rpc('fn_test_expire_card', { p_card_id: f4.card.id }); // expire via SECURITY DEFINER (bypass RLS)
  await rpc('fn_expire_jobs', {});
  const f6 = await rpc('fn_get_serveur_fiche', { p_customer_id: c.customer.id });
  ok(f6?.card?.status === 'expired', 'Carte expirée (clôture du cycle)');
  await expectError(
    () => rpc('fn_add_consumption', { p_card_id: f4.card.id, p_employee_id: employeeId }),
    'CARTE_EXPIRED',
    'Ajout de consommation refusé sur carte expirée',
  );

  section('8. Renouvellement de carte (nouveau cycle)');
  const renew = await rpc('fn_renew_card', { p_customer_id: c.customer.id });
  ok(renew?.card?.status === 'active', 'Nouvelle carte active');
  ok(renew?.card?.card_number !== c.card.card_number, 'Nouveau numéro de carte généré');
  const f7 = await rpc('fn_get_serveur_fiche', { p_customer_id: c.customer.id });
  ok(f7?.active_cycle?.current_consumptions === 0, 'Nouveau cycle à 0/9');

  section('9. Expiration d\'une récomponse non utilisée → REWARD_EXPIRED');
  for (let i = 0; i < 9; i++) await rpc('fn_add_consumption', { p_card_id: renew.card.id, p_employee_id: employeeId });
  const f8 = await rpc('fn_get_serveur_fiche', { p_customer_id: c.customer.id });
  const reward2 = f8?.rewards?.find((r: any) => r.status === 'available');
  ok(reward2?.status === 'available', 'Récomponse disponible');
  await db.rpc('fn_test_expire_reward', { p_reward_id: reward2.id }); // expire via SECURITY DEFINER (bypass RLS)
  await rpc('fn_expire_jobs', {});
  const f9 = await rpc('fn_get_serveur_fiche', { p_customer_id: c.customer.id });
  ok(f9?.rewards?.find((r: any) => r.id === reward2.id)?.status === 'expired', 'Récomponse expirée');
  await expectError(
    () => rpc('fn_apply_reward', { p_reward_id: reward2.id, p_employee_id: employeeId }),
    'REWARD_EXPIRED',
    'Application de la récomponse expirée refusée',
  );

  section('10. Double utilisation de la récomponse');
  // Après le test 9, reward2 a expiré : renouveler la carte et créer une nouvelle récompense
  const renew10 = await rpc('fn_renew_card', { p_customer_id: c.customer.id });
  ok(renew10?.card?.status === 'active', 'Carte renouvelée pour test double utilisation');
  for (let i = 0; i < 9; i++) await rpc('fn_add_consumption', { p_card_id: renew10.card.id, p_employee_id: employeeId });
  const f10 = await rpc('fn_get_serveur_fiche', { p_customer_id: c.customer.id });
  const reward3 = f10?.rewards?.find((r: any) => r.status === 'available');
  if (reward3) {
    await rpc('fn_apply_reward', { p_reward_id: reward3.id, p_employee_id: employeeId });
    ok(true, 'Récomponse appliquée (1ère)');
    await expectError(
      () => rpc('fn_apply_reward', { p_reward_id: reward3.id, p_employee_id: employeeId }),
      'REWARD_NOT_AVAILABLE',
      'Double utilisation refusée',
    );
  } else {
    ok(false, 'Récomponse disponible introuvable — pas de test de double utilisation');
  }

  section('11. Correction d\'erreur avec justification');
  const f11 = await rpc('fn_get_serveur_fiche', { p_customer_id: c.customer.id });
  const tx = f11?.history?.[0];
  if (tx?.id) {
    const corr = await rpc('fn_correction', { p_transaction_id: tx.id, p_justification: 'Erreur de saisie — ne compte pas', p_employee_id: employeeId });
    ok(corr?.transaction_id === tx.id, 'Correction enregistrée (transaction annulée)');
    await expectError(
      () => rpc('fn_correction', { p_transaction_id: tx.id, p_justification: 'Seconde tentative', p_employee_id: employeeId }),
      'ALREADY_CANCELLED',
      'Double correction refusée',
    );
  } else {
    ok(false, 'Transaction à corriger introuvable — historique vide ?');
  }

  section('12. Lecture fiche client (public, token haché)');
  const tokenHashNew = (await db.from('LoyaltyCards').select('token_hash').order('created_at.desc').limit(1)).data?.[0]?.token_hash;
  const cardClient = await rpc('fn_get_client_card', { p_token_hash: tokenHashNew });
  ok(cardClient?.customer?.first_name, `Fiche client visible pour : ${cardClient?.customer?.first_name ?? '??'}`);
  ok(cardClient?.card?.card_number, `Numéro de carte affiché : ${cardClient?.card?.card_number ?? '??'}`);
  ok(!('public_token' in (cardClient?.card ?? {})), 'Pas de token en clair exposé au client');

  section('13. Paramètres dynamiques (admin)');
  const before = await rpc('fn_update_settings', { p_employee_id: employeeId });
  const changed = await rpc('fn_update_settings', { p_employee_id: employeeId, p_required_consumptions: 12, p_discount_percentage: 40 });
  ok(changed?.required_consumptions === 12 && changed?.discount_percentage === 40, 'Paramètres mis à jour (12 / 40)');
  await rpc('fn_update_settings', { p_employee_id: employeeId, p_required_consumptions: before.required_consumptions, p_discount_percentage: before.discount_percentage });
  const restored = await rpc('fn_update_settings', { p_employee_id: employeeId });
  ok(restored?.required_consumptions === 9 && restored?.discount_percentage === 30, 'Paramètres restaurés (9 / 30)');

  section('14. Recherche clients (serveurs)');
  const search = await rpc('fn_search_customers', { p_query: c.customer.phone.slice(0, 8) });
  ok(search?.some((x: any) => x.id === c.customer.id), 'Client trouvé par recherche (numéro de téléphone)');

  section('15. Tableau de bord');
  const stats = await rpc('fn_dashboard_stats');
  ok(typeof stats?.total_clients === 'number' && typeof stats?.active_cards === 'number', 'Statistiques du dashboard disponibles');

  // ── Cleanup ────────────────────────────────────────────────────
  section('16. Nettoyage (données de test supprimées)');
  await db.from('Rewards').delete().in('customer_id', [c.customer.id]);
  await db.from('ConsumptionTransactions').delete().in('customer_id', [c.customer.id]);
  await db.from('LoyaltyCycles').delete().in('customer_id', [c.customer.id]);
  await db.from('LoyaltyCards').delete().in('customer_id', [c.customer.id]);
  await db.from('Corrections').delete();
  await db.from('Customers').delete().in('id', [c.customer.id]);
  results.push('  (données de test supprimées)');

  // ── Résumé ──────────────────────────────────────────────────────
  console.log(results.join('\n'));
  console.log(`\n${failures === 0 ? '✅ TOUS LES TESTS PASSENT' : `❌ ${failures} TEST(S) ÉCHOUENT`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.log(results.join('\n'));
  console.error('\n❌ Erreur d\'exécution :', e);
  process.exit(1);
});
