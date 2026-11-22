-- =====================================================================
-- Bieny Coffeeshop — Système digital de fidélisation
-- Supabase Cloud — Migration 001 : schéma, relations, index, RLS, fonctions
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------
-- Tables (noms au format PascalCase, conformément à la spécification)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "Customers" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "LoyaltyCards" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES "Customers"(id),
  card_number TEXT NOT NULL UNIQUE,        -- ex: CLI-A1B2C3D4 (affiché au client)
  public_token TEXT NOT NULL UNIQUE,       -- lien personnel (servies aux clients, serveur-side only)
  token_hash TEXT NOT NULL UNIQUE,         -- SHA-256 du token, stocké comme empreinte
  start_date TIMESTAMPTZ NOT NULL,
  expiration_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',   -- active | expired | completed | archived
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cards_status CHECK (status IN ('active','expired','completed','archived')),
  CONSTRAINT cards_expiration_after_start CHECK (expiration_date >= start_date)
);

CREATE TABLE IF NOT EXISTS "LoyaltyCycles" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES "Customers"(id),
  card_id UUID NOT NULL REFERENCES "LoyaltyCards"(id),
  required_consumptions INT NOT NULL CHECK (required_consumptions >= 1),
  current_consumptions INT NOT NULL DEFAULT 0 CHECK (current_consumptions >= 0),
  status TEXT NOT NULL DEFAULT 'active',   -- active | completed
  started_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cycles_status CHECK (status IN ('active','completed')),
  CONSTRAINT cycles_count CHECK (current_consumptions <= required_consumptions),
  CONSTRAINT cycles_expiry CHECK (expires_at > started_at)
);

CREATE TABLE IF NOT EXISTS "Employees" (
  id UUID PRIMARY KEY,                      -- = auth.users.id (Supabase Auth)
  role TEXT NOT NULL DEFAULT 'server',      -- server | admin
  status TEXT NOT NULL DEFAULT 'active',    -- active | inactive | disabled
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT employees_role CHECK (role IN ('server','admin')),
  CONSTRAINT employees_status CHECK (status IN ('active','inactive','disabled')),
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "ConsumptionTransactions" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES "LoyaltyCycles"(id),
  customer_id UUID NOT NULL REFERENCES "Customers"(id),
  employee_id UUID NOT NULL REFERENCES auth.users(id),
  transaction_reference TEXT NOT NULL UNIQUE, -- ex: TRX-a1b2c3d4e5f6
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'recorded',  -- recorded | cancelled
  CONSTRAINT tx_status CHECK (status IN ('recorded','cancelled'))
);

CREATE TABLE IF NOT EXISTS "Rewards" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES "Customers"(id),
  cycle_id UUID NOT NULL REFERENCES "LoyaltyCycles"(id),
  discount_percentage INT NOT NULL CHECK (discount_percentage BETWEEN 1 AND 100),
  status TEXT NOT NULL DEFAULT 'available', -- available | used | expired
  unlocked_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  used_by_employee_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT rewards_status CHECK (status IN ('available','used','expired')),
  CONSTRAINT rewards_expiry CHECK (expires_at > unlocked_at),
  CONSTRAINT rewards_used CHECK (
    (status <> 'used' AND used_at IS NULL AND used_by_employee_id IS NULL) OR
    (status = 'used' AND used_at IS NOT NULL AND used_by_employee_id IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS "AuditLogs" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES auth.users(id), -- NULL = tâche automatique (job d'expiration)
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "ProgramSettings" (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  required_consumptions INT NOT NULL DEFAULT 9,
  discount_percentage INT NOT NULL DEFAULT 30,
  card_validity_days INT NOT NULL DEFAULT 30,
  reward_validity_days INT NOT NULL DEFAULT 7,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  CONSTRAINT settings_required CHECK (required_consumptions >= 1),
  CONSTRAINT settings_discount CHECK (discount_percentage BETWEEN 1 AND 100),
  CONSTRAINT settings_validity CHECK (card_validity_days >= 1),
  CONSTRAINT settings_reward CHECK (reward_validity_days >= 1)
);

CREATE TABLE IF NOT EXISTS "Corrections" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES "ConsumptionTransactions"(id),
  justification TEXT NOT NULL,
  employee_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_cards_customer ON "LoyaltyCards"(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_cards_token ON "LoyaltyCards"(token_hash);
CREATE INDEX IF NOT EXISTS idx_cycles_card ON "LoyaltyCycles"(card_id, status);
CREATE INDEX IF NOT EXISTS idx_cycles_customer ON "LoyaltyCycles"(customer_id, started_at);
CREATE INDEX IF NOT EXISTS idx_tx_cycle ON "ConsumptionTransactions"(cycle_id, created_at);
CREATE INDEX IF NOT EXISTS idx_tx_customer ON "ConsumptionTransactions"(customer_id, created_at);
CREATE INDEX IF NOT EXISTS idx_rewards_customer ON "Rewards"(customer_id, unlocked_at DESC);
CREATE INDEX IF NOT EXISTS idx_rewards_cycle ON "Rewards"(cycle_id, unlocked_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON "AuditLogs"(entity_type, entity_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_employee ON "AuditLogs"(employee_id, created_at);
CREATE INDEX IF NOT EXISTS idx_employees_status ON "Employees"(status);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON "Customers"(phone);

-- ---------------------------------------------------------------------
-- RLS — client en lecture seule via lien personnel (defense-in-depth)
-- ---------------------------------------------------------------------

ALTER TABLE "Customers" ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_anon_read_customers ON "Customers" FOR SELECT TO anon USING (true);

ALTER TABLE "LoyaltyCards" ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_anon_read_cards ON "LoyaltyCards" FOR SELECT TO anon USING (true);

ALTER TABLE "LoyaltyCycles" ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_anon_read_cycles ON "LoyaltyCycles" FOR SELECT TO anon USING (true);

ALTER TABLE "Rewards" ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_anon_read_rewards ON "Rewards" FOR SELECT TO anon USING (true);

ALTER TABLE "ConsumptionTransactions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_anon_read_tx ON "ConsumptionTransactions" FOR SELECT TO anon USING (true);

ALTER TABLE "ProgramSettings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_anon_read_settings ON "ProgramSettings" FOR SELECT TO anon USING (true);

-- Employés, journaux d'audit et corrections : lus par les serveurs (l'app utilise le clé publishable)
ALTER TABLE "Employees" ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_anon_read_employees ON "Employees" FOR SELECT TO anon USING (true);
ALTER TABLE "AuditLogs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_anon_read_audit ON "AuditLogs" FOR SELECT TO anon USING (true);
ALTER TABLE "Corrections" ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_anon_read_corrections ON "Corrections" FOR SELECT TO anon USING (true);

-- service_role (Edge Functions) : accès complet
ALTER TABLE "Customers" ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_service_customers ON "Customers" TO service_role USING (true);
CREATE POLICY rls_service_cards ON "LoyaltyCards" TO service_role USING (true);
CREATE POLICY rls_service_cycles ON "LoyaltyCycles" TO service_role USING (true);
CREATE POLICY rls_service_rewards ON "Rewards" TO service_role USING (true);
CREATE POLICY rls_service_tx ON "ConsumptionTransactions" TO service_role USING (true);
CREATE POLICY rls_service_settings ON "ProgramSettings" TO service_role USING (true);

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------

-- Carte expirée (valable jusqu'à la date d'expiration incluse)
CREATE OR REPLACE FUNCTION card_expired(p_expiration TIMESTAMPTZ)
RETURNS BOOLEAN LANGUAGE sql IMMUTABLE AS $$
  SELECT CURRENT_DATE > ((p_expiration AT TIME ZONE 'Africa/Tunis')::date);
$$;

-- ---------------------------------------------------------------------
-- Fonctions SQL — équivalents sécurisés des Edge Functions (Modules)
-- ---------------------------------------------------------------------

-- 1) Création d'un client (génère card + cycle, retourne le lien personnel)
CREATE OR REPLACE FUNCTION fn_create_customer(
  p_first_name TEXT, p_last_name TEXT, p_phone TEXT
) RETURNS JSONB LANGUAGE plpgsql VOLATILE AS $$
DECLARE
  v_customer_id UUID; v_card_id UUID; v_cycle_id UUID;
  v_public_token TEXT; v_token_hash TEXT; v_card_number TEXT;
  v_settings_row "ProgramSettings";
BEGIN
  IF trim(p_first_name) = '' OR trim(p_last_name) = '' OR trim(p_phone) = ''
    THEN RAISE EXCEPTION 'EMPTY_FIELDS' USING ERRCODE='22003'; END IF;

  SELECT * INTO v_settings_row FROM "ProgramSettings" WHERE id = 1;

  -- Numéro de téléphone unique
  IF EXISTS (SELECT 1 FROM "Customers" WHERE phone = trim(p_phone))
    THEN RAISE EXCEPTION 'PHONE_DUPLICATE' USING ERRCODE='23505'; END IF;

  INSERT INTO "Customers" (first_name, last_name, phone)
  VALUES (trim(p_first_name), trim(p_last_name), trim(p_phone))
  RETURNING id INTO v_customer_id;

  v_public_token := 'lc_' || encode(gen_random_bytes(32), 'hex');
  v_token_hash := encode(sha256(v_public_token::bytea), 'hex');
  v_card_number := 'CLI-' || upper(encode(gen_random_bytes(4), 'hex'));
  v_cycle_id := gen_random_uuid();

  INSERT INTO "LoyaltyCards" (customer_id, card_number, public_token, token_hash, start_date, expiration_date, status)
  VALUES (v_customer_id, v_card_number, v_public_token, v_token_hash,
          NOW(), NOW() + (v_settings_row.card_validity_days || ' days')::interval, 'active')
  RETURNING id INTO v_card_id;

  INSERT INTO "LoyaltyCycles" (id, customer_id, card_id, required_consumptions, current_consumptions, status, started_at, expires_at)
  VALUES (v_cycle_id, v_customer_id, v_card_id, v_settings_row.required_consumptions, 0, 'active', NOW(), NOW() + (v_settings_row.card_validity_days || ' days')::interval);

  INSERT INTO "AuditLogs" (employee_id, action, entity_type, entity_id, details)
  VALUES (NULL, 'create_customer', 'Customers', v_customer_id,
          jsonb_build_object('phone', trim(p_phone), 'card_number', v_card_number, 'link', '/client/' || v_public_token));

  RETURN jsonb_build_object(
    'customer', jsonb_build_object('id', v_customer_id, 'first_name', trim(p_first_name), 'last_name', trim(p_last_name), 'phone', trim(p_phone)),
    'card', jsonb_build_object('id', v_card_id, 'card_number', v_card_number, 'public_token', v_public_token, 'status', 'active', 'start_date', NOW(), 'expiration_date', NOW() + (v_settings_row.card_validity_days || ' days')::interval),
    'link', '/client/' || v_public_token
  );
END;
$$;

-- 2) Création d'une nouvelle carte (nouveau cycle)
CREATE OR REPLACE FUNCTION fn_renew_card(p_customer_id UUID)
RETURNS JSONB LANGUAGE plpgsql VOLATILE AS $$
DECLARE
  v_card "LoyaltyCards"; v_settings_row "ProgramSettings";
  v_public_token TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM "LoyaltyCards"
             WHERE customer_id = p_customer_id AND status = 'active' AND NOT card_expired(expiration_date))
    THEN RAISE EXCEPTION 'CARD_ALREADY_ACTIVE'; END IF;

  UPDATE "LoyaltyCards" SET status = 'archived'
  WHERE customer_id = p_customer_id AND status = 'expired';

  SELECT * INTO v_settings_row FROM "ProgramSettings" WHERE id = 1;
  v_public_token := 'lc_' || encode(gen_random_bytes(32), 'hex');

  INSERT INTO "LoyaltyCards" (customer_id, card_number, public_token, token_hash, start_date, expiration_date, status)
  VALUES (p_customer_id, 'CLI-' || upper(encode(gen_random_bytes(4), 'hex')), v_public_token,
          encode(sha256(v_public_token::bytea), 'hex'), NOW(), NOW() + (v_settings_row.card_validity_days || ' days')::interval, 'active')
  RETURNING * INTO v_card;

  INSERT INTO "LoyaltyCycles" (customer_id, card_id, required_consumptions, current_consumptions, status, started_at, expires_at)
  VALUES (p_customer_id, v_card.id, v_settings_row.required_consumptions, 0, 'active', v_card.start_date, v_card.expiration_date);

  INSERT INTO "AuditLogs" (employee_id, action, entity_type, entity_id, details)
  VALUES (NULL, 'renew_card', 'LoyaltyCards', v_card.id, jsonb_build_object('card_number', v_card.card_number, 'link', '/client/' || v_public_token));

  RETURN jsonb_build_object('card', jsonb_build_object('id', v_card.id, 'card_number', v_card.card_number, 'status', v_card.status, 'start_date', v_card.start_date, 'expiration_date', v_card.expiration_date));
END;
$$;

-- 3) Ajouter une consommation (déjà payée) — débloque la récompense à 9/9
CREATE OR REPLACE FUNCTION fn_add_consumption(p_card_id UUID, p_employee_id UUID)
RETURNS JSONB LANGUAGE plpgsql VOLATILE AS $$
DECLARE
  v_cardid UUID; v_cycle "LoyaltyCycles"; v_new_count INT;
  v_settings_row "ProgramSettings"; v_reward_id UUID := NULL; v_tx_id UUID;
BEGIN
  -- Carte active et non expirée
  SELECT id INTO v_cardid FROM "LoyaltyCards"
  WHERE id = p_card_id AND status = 'active' AND NOT card_expired(expiration_date)
  LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'CARTE_EXPIRED'; END IF;

  -- Charge le cycle actif (verrouillé)
  SELECT c.* INTO v_cycle
  FROM "LoyaltyCycles" c
  WHERE c.card_id = v_cardid AND c.status = 'active' AND NOT card_expired(c.expires_at)
  ORDER BY c.started_at DESC LIMIT 1
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CARTE_EXPIRED'; END IF;

  -- Récompense en attente (ne pas consommer avant d'utiliser la récompense)
  IF EXISTS (SELECT 1 FROM "Rewards" r WHERE r.cycle_id = v_cycle.id AND r.status = 'available' AND NOW() < r.expires_at)
    THEN RAISE EXCEPTION 'REWARD_PENDING'; END IF;

  -- Cycle complet (sécurité)
  IF v_cycle.current_consumptions >= v_cycle.required_consumptions
    THEN RAISE EXCEPTION 'REWARD_PENDING'; END IF;

  -- Enregistrement unique de la consommation
  INSERT INTO "ConsumptionTransactions" (cycle_id, customer_id, employee_id, transaction_reference, status)
  VALUES (v_cycle.id, v_cycle.customer_id, p_employee_id,
          'TRX-' || encode(gen_random_bytes(6), 'hex'), 'recorded')
  RETURNING id INTO v_tx_id;

  -- Incrément du compteur
  UPDATE "LoyaltyCycles" SET current_consumptions = current_consumptions + 1
  WHERE id = v_cycle.id
  RETURNING current_consumptions INTO v_new_count;

  -- Déblocage de la récomponse à 9/9
  IF v_new_count >= v_cycle.required_consumptions
     AND NOT EXISTS (SELECT 1 FROM "Rewards" WHERE cycle_id = v_cycle.id AND status = 'available')
  THEN
    SELECT * INTO v_settings_row FROM "ProgramSettings" WHERE id = 1;
    INSERT INTO "Rewards" (customer_id, cycle_id, discount_percentage, status, unlocked_at, expires_at)
    VALUES (v_cycle.customer_id, v_cycle.id, v_settings_row.discount_percentage, 'available',
            NOW(), NOW() + (v_settings_row.reward_validity_days || ' days')::interval)
    RETURNING id INTO v_reward_id;
    INSERT INTO "AuditLogs" (employee_id, action, entity_type, entity_id, details)
    VALUES (p_employee_id, 'unlock_reward', 'Rewards', v_reward_id, jsonb_build_object('cycle_id', v_cycle.id, 'discount_percentage', v_settings_row.discount_percentage));
  END IF;

  INSERT INTO "AuditLogs" (employee_id, action, entity_type, entity_id, details)
  VALUES (p_employee_id, 'add_consumption', 'ConsumptionTransactions', v_tx_id,
          jsonb_build_object('card_id', p_card_id, 'cycle_id', v_cycle.id, 'current_consumptions', v_new_count, 'required_consumptions', v_cycle.required_consumptions));

  RETURN jsonb_build_object(
    'transaction_id', v_tx_id,
    'cycle', jsonb_build_object('id', v_cycle.id, 'current_consumptions', v_new_count, 'required_consumptions', v_cycle.required_consumptions),
    'reward_unlocked', v_reward_id IS NOT NULL
  );
END;
$$;

-- 4) Utiliser la récompense (30% sur la prochaine commande, une seule fois)
CREATE OR REPLACE FUNCTION fn_apply_reward(p_reward_id UUID, p_employee_id UUID)
RETURNS JSONB LANGUAGE plpgsql VOLATILE AS $$
DECLARE
  v_reward "Rewards"; v_card_id UUID; v_card_status TEXT;
  v_new_cycle_id UUID; v_new_expires TIMESTAMPTZ; v_settings_row "ProgramSettings";
BEGIN
  -- Charge la récomponse disponible (FOR UPDATE anti double-usage)
  SELECT * INTO v_reward FROM "Rewards" WHERE id = p_reward_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'REWARD_NOT_FOUND'; END IF;
  IF v_reward.status <> 'available' THEN RAISE EXCEPTION 'REWARD_NOT_AVAILABLE'; END IF;
  IF NOW() >= v_reward.expires_at THEN RAISE EXCEPTION 'REWARD_EXPIRED'; END IF;

  -- Carte du cycle — peut être expirée (la récomponse reste valide 7j)
  SELECT card_id INTO v_card_id FROM "LoyaltyCycles" WHERE id = v_reward.cycle_id;
  SELECT status INTO v_card_status FROM "LoyaltyCards" WHERE id = v_card_id;

  -- Marquer la récomponse utilisée
  UPDATE "Rewards" SET status = 'used', used_at = NOW(), used_by_employee_id = p_employee_id
  WHERE id = v_reward.id;

  -- Clôturer le cycle précédent
  UPDATE "LoyaltyCycles" SET status = 'completed', completed_at = NOW() WHERE id = v_reward.cycle_id;

  -- Ouvrir le nouveau cycle (30 jours)
  SELECT * INTO v_settings_row FROM "ProgramSettings" WHERE id = 1;
  v_new_expires := NOW() + (v_settings_row.card_validity_days || ' days')::interval;
  INSERT INTO "LoyaltyCycles" (customer_id, card_id, required_consumptions, current_consumptions, status, started_at, expires_at)
  VALUES (v_reward.customer_id, v_card_id, v_settings_row.required_consumptions, 0, 'active', NOW(), v_new_expires)
  RETURNING id INTO v_new_cycle_id;

  -- Réactiver la carte (même expirée)
  UPDATE "LoyaltyCards"
  SET status = 'active', start_date = NOW(), expiration_date = v_new_expires
  WHERE id = v_card_id;

  INSERT INTO "AuditLogs" (employee_id, action, entity_type, entity_id, details)
  VALUES (p_employee_id, 'apply_reward', 'Rewards', v_reward.id, jsonb_build_object('discount_percentage', v_reward.discount_percentage, 'card_status_before', v_card_status));

  RETURN jsonb_build_object(
    'reward', jsonb_build_object('id', v_reward.id, 'status', 'used', 'discount_percentage', v_reward.discount_percentage),
    'new_cycle', jsonb_build_object('id', v_new_cycle_id, 'current_consumptions', 0, 'required_consumptions', v_settings_row.required_consumptions, 'expires_at', v_new_expires)
  );
END;
$$;

-- 5) Job d'expiration : cartes, cycles et récompenses expirées
CREATE OR REPLACE FUNCTION fn_expire_jobs()
RETURNS JSONB LANGUAGE plpgsql VOLATILE AS $$
BEGIN
  -- Cartes expirées
  UPDATE "LoyaltyCards" SET status = 'expired'
  WHERE status = 'active' AND card_expired(expiration_date);

  -- Cycles expirés → clôturés (compteur conservé, plus de consommations possibles)
  UPDATE "LoyaltyCycles" SET status = 'completed', completed_at = NOW()
  WHERE status = 'active' AND card_expired((SELECT expiration_date FROM "LoyaltyCards" WHERE "LoyaltyCards".id = "LoyaltyCycles".card_id));

  -- Récompenses expirées sans être utilisées
  UPDATE "Rewards" SET status = 'expired'
  WHERE status = 'available' AND NOW() >= expires_at;

  INSERT INTO "AuditLogs" (employee_id, action, entity_type, details)
  VALUES (NULL, 'expire_jobs', 'System', jsonb_build_object('note', 'Job d''expiration exécuté'));

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- 6) Fiche serveur (card active, cycle, rewards, histoire, flags d'action)
CREATE OR REPLACE FUNCTION fn_get_serveur_fiche(p_customer_id UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
DECLARE v_cardid UUID; v_cycleid UUID;
BEGIN
  SELECT id INTO v_cardid FROM "LoyaltyCards" WHERE customer_id = p_customer_id ORDER BY created_at DESC LIMIT 1;
  SELECT id INTO v_cycleid FROM "LoyaltyCycles" WHERE card_id = v_cardid AND status = 'active' ORDER BY started_at DESC LIMIT 1;

  RETURN jsonb_build_object(
    'customer', (SELECT jsonb_build_object('id', id, 'first_name', first_name, 'last_name', last_name, 'phone', phone)
                 FROM "Customers" WHERE id = p_customer_id),
    'card', (SELECT CASE WHEN v_cardid IS NULL THEN NULL ELSE jsonb_build_object(
      'id', c.id, 'card_number', c.card_number, 'status', c.status,
      'start_date', c.start_date, 'expiration_date', c.expiration_date, 'created_at', c.created_at) END
      FROM "LoyaltyCards" c WHERE c.id = v_cardid),
    'active_cycle', (SELECT CASE WHEN v_cycleid IS NULL THEN NULL ELSE jsonb_build_object(
      'id', y.id, 'current_consumptions', y.current_consumptions, 'required_consumptions', y.required_consumptions,
      'started_at', y.started_at, 'expires_at', y.expires_at, 'status', y.status) END
      FROM "LoyaltyCycles" y WHERE y.id = v_cycleid),
    'can_add_consumption', (SELECT EXISTS(
      SELECT 1 FROM "LoyaltyCards" b
      WHERE b.customer_id = p_customer_id AND b.status = 'active' AND NOT card_expired(b.expiration_date)
        AND EXISTS(SELECT 1 FROM "LoyaltyCycles" c WHERE c.card_id = b.id AND c.status = 'active' AND NOT card_expired(c.expires_at))
    )),
    'rewards', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', r.id, 'status', r.status, 'discount_percentage', r.discount_percentage,
        'unlocked_at', r.unlocked_at, 'expires_at', r.expires_at, 'used_at', r.used_at,
        'is_expired', NOW() >= r.expires_at, 'is_available', r.status = 'available') ORDER BY r.unlocked_at DESC), '[]'::jsonb)
      FROM "Rewards" r WHERE r.customer_id = p_customer_id),
    'history', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', t.id, 'transaction_reference', t.transaction_reference, 'created_at', t.created_at,
        'status', t.status, 'employee_name', e.name) ORDER BY t.created_at DESC), '[]'::jsonb)
      FROM "ConsumptionTransactions" t LEFT JOIN auth.users e ON e.id = t.employee_id
      WHERE t.customer_id = p_customer_id)
  );
END;
$$;

-- 7) Fiche client (public, via token — lecture seule)
CREATE OR REPLACE FUNCTION fn_get_client_card(p_token_hash TEXT)
RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
DECLARE v_cardid UUID;
BEGIN
  SELECT id INTO v_cardid FROM "LoyaltyCards" WHERE token_hash = p_token_hash LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;

  RETURN jsonb_build_object(
    'card', jsonb_build_object('id', c.card_number, 'card_number', c.card_number, 'status', c.status,
                               'start_date', c.start_date, 'expiration_date', c.expiration_date),
    'customer', jsonb_build_object('id', cu.id, 'first_name', cu.first_name, 'last_name', cu.last_name),
    'active_cycle', (SELECT CASE WHEN y IS NULL THEN NULL ELSE jsonb_build_object(
      'current_consumptions', y.current_consumptions, 'required_consumptions', y.required_consumptions,
      'started_at', y.started_at, 'expires_at', y.expires_at,
      'days_remaining', GREATEST(0, ((c.expiration_date AT TIME ZONE 'Africa/Tunis')::date - CURRENT_DATE) + 1)) END
      FROM "LoyaltyCycles" y WHERE y.card_id = v_cardid AND y.status = 'active' ORDER BY y.started_at DESC LIMIT 1),
    'rewards', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', r.id, 'status', r.status, 'discount_percentage', r.discount_percentage,
        'unlocked_at', r.unlocked_at, 'expires_at', r.expires_at, 'used_at', r.used_at,
        'is_available', r.status = 'available') ORDER BY r.unlocked_at DESC), '[]'::jsonb)
      FROM "Rewards" r WHERE r.customer_id = cu.id),
    'history', (SELECT COALESCE(jsonb_agg(h.row ORDER BY h.created_at DESC), '[]'::jsonb)
      FROM (SELECT jsonb_build_object('id', t.id, 'transaction_reference', t.transaction_reference, 'created_at', t.created_at) AS row,
                   t.created_at
            FROM "ConsumptionTransactions" t
            WHERE t.customer_id = cu.id
            ORDER BY t.created_at DESC
            LIMIT 20) h)
  )
  FROM "LoyaltyCards" c
  JOIN "Customers" cu ON cu.id = c.customer_id
  WHERE c.id = v_cardid;
END;
$$;

-- 8) Statistiques du tableau de bord
CREATE OR REPLACE FUNCTION fn_dashboard_stats()
RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN jsonb_build_object(
    'total_clients', (SELECT count(*) FROM "Customers"),
    'active_cards', (SELECT count(*) FROM "LoyaltyCards" WHERE status = 'active' AND NOT card_expired(expiration_date)),
    'expired_cards', (SELECT count(*) FROM "LoyaltyCards" WHERE status = 'expired'),
    'pending_rewards', (SELECT count(*) FROM "Rewards" WHERE status = 'available' AND NOW() < expires_at),
    'used_rewards', (SELECT count(*) FROM "Rewards" WHERE status = 'used'),
    'recent_operations', (SELECT COALESCE(jsonb_agg(al ORDER BY al.created_at DESC), '[]'::jsonb)
                          FROM "AuditLogs" al ORDER BY al.created_at DESC LIMIT 12)
  );
END;
$$;

-- 9) Recherche clients (serveurs : nom ou numéro de téléphone)
CREATE OR REPLACE FUNCTION fn_search_customers(p_query TEXT)
RETURNS SETOF jsonb LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object(
           'id', c.id, 'first_name', c.first_name, 'last_name', c.last_name, 'phone', c.phone,
           'has_active_card', EXISTS(SELECT 1 FROM "LoyaltyCards" b
                                     WHERE b.customer_id = c.id AND b.status = 'active'
                                       AND NOT card_expired(b.expiration_date)))
  FROM "Customers" c
  WHERE (p_query = '' OR c.phone ILIKE '%' || p_query || '%'
                     OR c.last_name ILIKE '%' || p_query || '%'
                     OR c.first_name ILIKE '%' || p_query || '%')
  ORDER BY c.last_name, c.first_name, c.phone
  LIMIT 50;
$$;

-- 10) Mise à jour des paramètres dynamiques (admin)
CREATE OR REPLACE FUNCTION fn_update_settings(
  p_employee_id UUID,
  p_required_consumptions INT DEFAULT NULL,
  p_discount_percentage INT DEFAULT NULL,
  p_card_validity_days INT DEFAULT NULL,
  p_reward_validity_days INT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql VOLATILE AS $$
DECLARE v_row "ProgramSettings";
BEGIN
  SELECT * INTO v_row FROM "ProgramSettings" WHERE id = 1 FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SETTINGS_NOT_FOUND'; END IF;

  UPDATE "ProgramSettings"
  SET required_consumptions = COALESCE(p_required_consumptions, v_row.required_consumptions),
      discount_percentage = COALESCE(p_discount_percentage, v_row.discount_percentage),
      card_validity_days = COALESCE(p_card_validity_days, v_row.card_validity_days),
      reward_validity_days = COALESCE(p_reward_validity_days, v_row.reward_validity_days),
      updated_at = NOW(), updated_by = p_employee_id
  WHERE id = 1 RETURNING * INTO v_row;

  INSERT INTO "AuditLogs" (employee_id, action, entity_type, entity_id, details)
  VALUES (p_employee_id, 'update_settings', 'ProgramSettings', 1, jsonb_build_object(
    'required_consumptions', v_row.required_consumptions, 'discount_percentage', v_row.discount_percentage,
    'card_validity_days', v_row.card_validity_days, 'reward_validity_days', v_row.reward_validity_days
  ));

  RETURN jsonb_build_object(
    'required_consumptions', v_row.required_consumptions,
    'discount_percentage', v_row.discount_percentage,
    'card_validity_days', v_row.card_validity_days,
    'reward_validity_days', v_row.reward_validity_days
  );
END;
$$;

-- 11) Correction d'erreur avec justification (admin)
CREATE OR REPLACE FUNCTION fn_correction(p_transaction_id UUID, p_justification TEXT, p_employee_id UUID)
RETURNS JSONB LANGUAGE plpgsql VOLATILE AS $$
DECLARE v_tx "ConsumptionTransactions"; v_cycle_id UUID; v_new_count INT;
BEGIN
  SELECT * INTO v_tx FROM "ConsumptionTransactions" WHERE id = p_transaction_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'TX_NOT_FOUND'; END IF;
  IF v_tx.status <> 'recorded' THEN RAISE EXCEPTION 'ALREADY_CANCELLED'; END IF;

  v_cycle_id := v_tx.cycle_id;

  UPDATE "ConsumptionTransactions" SET status = 'cancelled' WHERE id = p_transaction_id;
  INSERT INTO "Corrections" (transaction_id, justification, employee_id)
  VALUES (p_transaction_id, p_justification, p_employee_id);

  -- Décrémenter le compteur du cycle
  UPDATE "LoyaltyCycles" SET current_consumptions = GREATEST(0, current_consumptions - 1)
  WHERE id = v_cycle_id RETURNING current_consumptions INTO v_new_count;

  -- Si la récomponse en attente n'est plus possible → expirée
  UPDATE "Rewards" SET status = 'expired'
  WHERE cycle_id = v_cycle_id AND status = 'available' AND v_new_count < required_consumptions;

  INSERT INTO "AuditLogs" (employee_id, action, entity_type, entity_id, details)
  VALUES (p_employee_id, 'correction', 'ConsumptionTransactions', p_transaction_id,
          jsonb_build_object('justification', p_justification, 'new_consumptions', v_new_count));

  RETURN jsonb_build_object('transaction_id', p_transaction_id, 'new_consumptions', v_new_count);
END;
$$;

-- 12) Gestion des employés (role serveur / admin)
CREATE OR REPLACE FUNCTION fn_get_employees()
RETURNS SETOF jsonb LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object(
           'id', e.id, 'name', COALESCE(u.raw_user_meta_data->>'name', u.raw_app_meta_data->>'name', u.email), 'email', u.email,
           'role', e.role, 'status', e.status, 'created_at', e.created_at)
  FROM "Employees" e JOIN auth.users u ON u.id = e.id
  ORDER BY u.email;
$$;

-- Création d'un employé (serveur ou admin)
CREATE OR REPLACE FUNCTION fn_create_employee(
  p_admin_id UUID, p_name TEXT, p_email TEXT, p_password TEXT, p_role TEXT, p_status TEXT DEFAULT 'active'
) RETURNS JSONB LANGUAGE plpgsql VOLATILE AS $$
DECLARE v_id UUID;
BEGIN
  IF p_role NOT IN ('server','admin') THEN RAISE EXCEPTION 'INVALID_ROLE'; END IF;
  IF trim(p_email) = '' OR trim(p_name) = '' THEN RAISE EXCEPTION 'EMPTY_FIELDS'; END IF;
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = trim(p_email)) THEN RAISE EXCEPTION 'EMAIL_EXISTS'; END IF;

  -- Création de l'utilisateur via le RPC Supabase (attend p_email, p_password, p_user_metadata)
  v_id := (SELECT users_admin_create_user(
      p_email := trim(p_email),
      p_password := p_password,
      p_user_metadata := jsonb_build_object('name', trim(p_name), 'role', p_role, 'status', p_status)
  ));

  INSERT INTO "Employees" (id, role, status) VALUES (v_id, p_role, p_status);

  INSERT INTO "AuditLogs" (employee_id, action, entity_type, entity_id, details)
  VALUES (p_admin_id, 'create_employee', 'Employees', v_id, jsonb_build_object('email', trim(p_email), 'role', p_role, 'status', p_status));

  RETURN jsonb_build_object('id', v_id, 'name', trim(p_name), 'email', trim(p_email), 'role', p_role, 'status', p_status);
END;
$$;

-- Mise à jour d'un employé (statut / rôle)
CREATE OR REPLACE FUNCTION fn_update_employee(
  p_admin_id UUID, p_employee_id UUID, p_status TEXT DEFAULT NULL, p_role TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql VOLATILE AS $$
DECLARE v_emp "Employees";
BEGIN
  SELECT * INTO v_emp FROM "Employees" WHERE id = p_employee_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'EMPLOYEE_NOT_FOUND'; END IF;
  IF p_role IS NOT NULL AND p_role NOT IN ('server','admin') THEN RAISE EXCEPTION 'INVALID_ROLE'; END IF;

  UPDATE "Employees" SET status = COALESCE(p_status, status), role = COALESCE(p_role, role), updated_at = NOW()
  WHERE id = p_employee_id RETURNING role, status INTO v_emp;

  INSERT INTO "AuditLogs" (employee_id, action, entity_type, entity_id, details)
  VALUES (p_admin_id, 'update_employee', 'Employees', p_employee_id, jsonb_build_object('role', v_emp.role, 'status', v_emp.status));

  RETURN jsonb_build_object('id', p_employee_id, 'role', v_emp.role, 'status', v_emp.status);
END;
$$;

-- Rôle de l'employé actuel (depuis un Access Token Supabase)
CREATE OR REPLACE FUNCTION fn_get_employee_by_id(p_user_id UUID)
RETURNS JSONB LANGUAGE sql STABLE AS $$
  SELECT CASE WHEN e IS NULL THEN NULL ELSE jsonb_build_object(
      'id', e.id, 'role', e.role, 'status', e.status,
      'name', COALESCE(u.raw_user_meta_data->>'name', u.raw_app_meta_data->>'name', u.email), 'email', u.email) END
  FROM "Employees" e LEFT JOIN auth.users u ON u.id = e.id
  WHERE e.id = p_user_id;
$$;
