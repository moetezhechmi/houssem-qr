/**
 * Validation locale des migrations Supabase (via le PostgreSQL 18 local).
 * Valide : 001_schema, 002_seed, 003, 004, 005 + fonctions smoke-test.
 */
import { Client } from 'pg';
import fs from 'node:fs';

const client = new Client({ host: '127.0.0.1', port: 5432, user: 'postgres', password: 'postgres', database: 'postgres' });
await client.connect();

// Rôles Supabase-style (anon, authenticated, service_role) — requis pour les policies RLS
for (const role of ['anon', 'authenticated', 'service_role']) {
  await client.query(`DO $$ BEGIN CREATE ROLE ${role} NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
}
// auth.users stub
await client.query('CREATE SCHEMA IF NOT EXISTS auth');
await client.query(`CREATE TABLE IF NOT EXISTS auth.users (
  id UUID PRIMARY KEY, aud TEXT, role TEXT, email TEXT, email_verified_at TIMESTAMPTZ,
  is_anonymous BOOLEAN, encrypted_password TEXT, raw_user_meta_data JSONB, raw_app_meta_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
)`);

let failed = 0;
for (const f of ['001_schema.sql', '002_seed.sql', '003_fix_fn_create_employee.sql', '004_employee_name_email.sql', '005_fix_fn_dashboard_stats.sql']) {
  const sql = fs.readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8');
  try { await client.query(sql); console.log('✓', f); }
  catch (e) { failed++; console.log('✗', f, '->', e.message.slice(0, 300)); }
}

async function check(label, query, params = []) {
  try { const r = await client.query(query, params); console.log('✓', label, JSON.stringify(r.rows[0] ?? r.rows).slice(0, 250)); }
  catch (e) { failed++; console.log('✗', label, '->', e.message.slice(0, 250)); }
}

await check('tz Africa/Tunis', 'SELECT now() AT TIME ZONE \'Africa/Tunis\' AS tunis_time');
await check('fn_dashboard_stats()', 'SELECT fn_dashboard_stats() AS r');
await check('fn_get_employee_by_id(test)', 'SELECT fn_get_employee_by_id(\'00000000-0000-0000-0000-000000000000\') AS r');
await check('fn_get_client_card(bad) -> NULL', 'SELECT fn_get_client_card(\'bad\') AS r');
await check('fn_get_serveur_fiche(uuid)', 'SELECT fn_get_serveur_fiche(\'00000000-0000-0000-0000-000000000000\') AS r');

await client.end();
console.log(failed === 0 ? '\nALL LOCAL CHECKS PASSED' : `\n${failed} CHECK(S) FAILED`);
process.exit(failed === 0 ? 0 : 1);
