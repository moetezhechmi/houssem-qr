-- =====================================================================
-- Migration 011 — SaaS Multi-Tenant (Stores, Rôles Super Admin, Isolation Stores & Push)
-- =====================================================================

-- 1. Table des Boutiques / Prestataires / Cafés
CREATE TABLE IF NOT EXISTS "Stores" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  phone TEXT,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insertion du Store par défaut (Bieny Coffeeshop) s'il n'existe pas encore
INSERT INTO "Stores" (id, name, slug, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'Bieny Coffeeshop', 'bieny', 'active')
ON CONFLICT (slug) DO NOTHING;

-- 2. Mise à jour de la table Employees pour supporter :
-- - super_admin (le propriétaire de la plateforme SaaS)
-- - store_id (l'appartenance à un café / prestataire spécifique)
ALTER TABLE "Employees" DROP CONSTRAINT IF EXISTS employees_role;
ALTER TABLE "Employees" ADD CONSTRAINT employees_role CHECK (role IN ('server', 'admin', 'super_admin'));

ALTER TABLE "Employees" ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES "Stores"(id) ON DELETE SET NULL;

-- Par défaut, assigner tous les employés existants au store par défaut
UPDATE "Employees" 
SET store_id = '00000000-0000-0000-0000-000000000001'
WHERE store_id IS NULL AND role <> 'super_admin';

-- 3. Ajout de store_id sur toutes les entités de fidélité et opérations
ALTER TABLE "Customers" ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES "Stores"(id) ON DELETE CASCADE;
UPDATE "Customers" SET store_id = '00000000-0000-0000-0000-000000000001' WHERE store_id IS NULL;

-- Retirer l'unicité globale du téléphone pour permettre au même client d'avoir un compte dans deux cafés distincts
ALTER TABLE "Customers" DROP CONSTRAINT IF EXISTS customers_phone_key;
ALTER TABLE "Customers" DROP CONSTRAINT IF EXISTS "Customers_phone_key";
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_phone_per_store ON "Customers"(phone, store_id);

ALTER TABLE "LoyaltyCards" ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES "Stores"(id) ON DELETE CASCADE;
UPDATE "LoyaltyCards" SET store_id = '00000000-0000-0000-0000-000000000001' WHERE store_id IS NULL;

ALTER TABLE "LoyaltyCycles" ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES "Stores"(id) ON DELETE CASCADE;
UPDATE "LoyaltyCycles" SET store_id = '00000000-0000-0000-0000-000000000001' WHERE store_id IS NULL;

ALTER TABLE "ConsumptionTransactions" ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES "Stores"(id) ON DELETE CASCADE;
UPDATE "ConsumptionTransactions" SET store_id = '00000000-0000-0000-0000-000000000001' WHERE store_id IS NULL;

ALTER TABLE "Rewards" ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES "Stores"(id) ON DELETE CASCADE;
UPDATE "Rewards" SET store_id = '00000000-0000-0000-0000-000000000001' WHERE store_id IS NULL;

ALTER TABLE "AuditLogs" ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES "Stores"(id) ON DELETE CASCADE;
UPDATE "AuditLogs" SET store_id = '00000000-0000-0000-0000-000000000001' WHERE store_id IS NULL;

ALTER TABLE "Corrections" ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES "Stores"(id) ON DELETE CASCADE;
UPDATE "Corrections" SET store_id = '00000000-0000-0000-0000-000000000001' WHERE store_id IS NULL;

-- 4. ProgramSettings : Adapter pour un paramétrage par store
ALTER TABLE "ProgramSettings" DROP CONSTRAINT IF EXISTS programsettings_pkey;
ALTER TABLE "ProgramSettings" DROP CONSTRAINT IF EXISTS "ProgramSettings_pkey";
ALTER TABLE "ProgramSettings" DROP CONSTRAINT IF EXISTS programsettings_id_check;
ALTER TABLE "ProgramSettings" DROP CONSTRAINT IF EXISTS "ProgramSettings_id_check";

ALTER TABLE "ProgramSettings" ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES "Stores"(id) ON DELETE CASCADE;
UPDATE "ProgramSettings" SET store_id = '00000000-0000-0000-0000-000000000001' WHERE store_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_program_settings_store ON "ProgramSettings"(store_id);

-- 5. Notifications Push et Campagnes cloisonnées par Store
ALTER TABLE "PushSubscriptions" ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES "Stores"(id) ON DELETE CASCADE;
UPDATE "PushSubscriptions" SET store_id = '00000000-0000-0000-0000-000000000001' WHERE store_id IS NULL;

ALTER TABLE "NotificationCampaigns" ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES "Stores"(id) ON DELETE CASCADE;
UPDATE "NotificationCampaigns" SET store_id = '00000000-0000-0000-0000-000000000001' WHERE store_id IS NULL;

ALTER TABLE "NotificationHistory" ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES "Stores"(id) ON DELETE CASCADE;
UPDATE "NotificationHistory" SET store_id = '00000000-0000-0000-0000-000000000001' WHERE store_id IS NULL;

-- 6. Fonctions RPC révisées pour le multi-tenant

-- Récupérer l'employé avec son store
CREATE OR REPLACE FUNCTION fn_get_employee_by_id(p_user_id UUID)
RETURNS JSONB LANGUAGE sql STABLE AS $$
  SELECT CASE WHEN e IS NULL THEN NULL ELSE jsonb_build_object(
      'id', e.id, 
      'role', e.role, 
      'status', e.status,
      'name', e.name, 
      'email', e.email, 
      'store_id', e.store_id,
      'store_name', s.name,
      'store_slug', s.slug,
      'created_at', e.created_at) END
  FROM "Employees" e
  LEFT JOIN "Stores" s ON s.id = e.store_id
  WHERE e.id = p_user_id;
$$;

-- Liste des employés d'un store spécifique (ou tous pour super_admin)
CREATE OR REPLACE FUNCTION fn_get_employees_by_store(p_store_id UUID DEFAULT NULL)
RETURNS SETOF jsonb LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object(
           'id', e.id, 'name', e.name, 'email', e.email,
           'role', e.role, 'status', e.status, 
           'store_id', e.store_id,
           'store_name', s.name,
           'created_at', e.created_at)
  FROM "Employees" e
  LEFT JOIN "Stores" s ON s.id = e.store_id
  WHERE (p_store_id IS NULL OR e.store_id = p_store_id)
  ORDER BY e.name, e.email;
$$;

-- Statistiques Dashboard filtrées par store
CREATE OR REPLACE FUNCTION fn_dashboard_stats_by_store(p_store_id UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_today_start TIMESTAMPTZ := date_trunc('day', NOW());
  v_month_start TIMESTAMPTZ := date_trunc('month', NOW());
  v_customers_total INT;
  v_active_cards INT;
  v_today_tx INT;
  v_unlocked_rewards INT;
  v_available_rewards INT;
BEGIN
  SELECT COUNT(*) INTO v_customers_total FROM "Customers" WHERE (p_store_id IS NULL OR store_id = p_store_id);
  SELECT COUNT(*) INTO v_active_cards FROM "LoyaltyCards" WHERE status = 'active' AND (p_store_id IS NULL OR store_id = p_store_id);
  SELECT COUNT(*) INTO v_today_tx FROM "ConsumptionTransactions" WHERE created_at >= v_today_start AND status = 'recorded' AND (p_store_id IS NULL OR store_id = p_store_id);
  SELECT COUNT(*) INTO v_unlocked_rewards FROM "Rewards" WHERE unlocked_at >= v_month_start AND (p_store_id IS NULL OR store_id = p_store_id);
  SELECT COUNT(*) INTO v_available_rewards FROM "Rewards" WHERE status = 'available' AND (p_store_id IS NULL OR store_id = p_store_id);

  RETURN jsonb_build_object(
    'total_customers', v_customers_total,
    'active_cards', v_active_cards,
    'today_transactions', v_today_tx,
    'unlocked_rewards_this_month', v_unlocked_rewards,
    'available_rewards', v_available_rewards
  );
END;
$$;

-- Statistiques globales Super Admin pour toute la plateforme
CREATE OR REPLACE FUNCTION fn_super_admin_stats()
RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN jsonb_build_object(
    'total_stores', (SELECT COUNT(*) FROM "Stores"),
    'active_stores', (SELECT COUNT(*) FROM "Stores" WHERE status = 'active'),
    'total_employees', (SELECT COUNT(*) FROM "Employees"),
    'total_customers', (SELECT COUNT(*) FROM "Customers"),
    'total_transactions', (SELECT COUNT(*) FROM "ConsumptionTransactions" WHERE status = 'recorded'),
    'total_rewards_given', (SELECT COUNT(*) FROM "Rewards" WHERE status = 'used')
  );
END;
$$;
