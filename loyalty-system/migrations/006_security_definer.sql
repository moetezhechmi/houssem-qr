-- =====================================================================
-- Bieny Coffeeshop — Migration 006 : Activation de SECURITY DEFINER
-- 100% compatible Supabase Cloud (sans dépendance d'extension fragile)
-- À exécuter dans le Supabase Dashboard -> SQL Editor
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 1) Création d'un client et de sa première carte
CREATE OR REPLACE FUNCTION fn_create_customer(
  p_first_name TEXT, p_last_name TEXT, p_phone TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
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

  -- Génération robuste sans dépendance externe
  v_public_token := 'lc_' || replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_token_hash := encode(sha256(v_public_token::bytea), 'hex');
  v_card_number := 'CLI-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
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

-- 2) Renouvellement de carte
CREATE OR REPLACE FUNCTION fn_renew_card(p_customer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
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
  v_public_token := 'lc_' || replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

  INSERT INTO "LoyaltyCards" (customer_id, card_number, public_token, token_hash, start_date, expiration_date, status)
  VALUES (p_customer_id, 'CLI-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)), v_public_token,
          encode(sha256(v_public_token::bytea), 'hex'), NOW(), NOW() + (v_settings_row.card_validity_days || ' days')::interval, 'active')
  RETURNING * INTO v_card;

  INSERT INTO "LoyaltyCycles" (customer_id, card_id, required_consumptions, current_consumptions, status, started_at, expires_at)
  VALUES (p_customer_id, v_card.id, v_settings_row.required_consumptions, 0, 'active', v_card.start_date, v_card.expiration_date);

  INSERT INTO "AuditLogs" (employee_id, action, entity_type, entity_id, details)
  VALUES (NULL, 'renew_card', 'LoyaltyCards', v_card.id, jsonb_build_object('card_number', v_card.card_number, 'link', '/client/' || v_public_token));

  RETURN jsonb_build_object('card', jsonb_build_object('id', v_card.id, 'card_number', v_card.card_number, 'status', v_card.status, 'start_date', v_card.start_date, 'expiration_date', v_card.expiration_date));
END;
$$;

-- 3) Ajouter une consommation (débloque récompense à 9/9)
CREATE OR REPLACE FUNCTION fn_add_consumption(p_card_id UUID, p_employee_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_cardid UUID; v_cycle "LoyaltyCycles"; v_new_count INT;
  v_settings_row "ProgramSettings"; v_reward_id UUID := NULL; v_tx_id UUID;
BEGIN
  SELECT id INTO v_cardid FROM "LoyaltyCards"
  WHERE id = p_card_id AND status = 'active' AND NOT card_expired(expiration_date)
  LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'CARTE_EXPIRED'; END IF;

  SELECT c.* INTO v_cycle
  FROM "LoyaltyCycles" c
  WHERE c.card_id = v_cardid AND c.status = 'active' AND NOT card_expired(c.expires_at)
  ORDER BY c.started_at DESC LIMIT 1
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CARTE_EXPIRED'; END IF;

  IF EXISTS (SELECT 1 FROM "Rewards" r WHERE r.cycle_id = v_cycle.id AND r.status = 'available' AND NOW() < r.expires_at)
    THEN RAISE EXCEPTION 'REWARD_PENDING'; END IF;

  IF v_cycle.current_consumptions >= v_cycle.required_consumptions
    THEN RAISE EXCEPTION 'REWARD_PENDING'; END IF;

  INSERT INTO "ConsumptionTransactions" (cycle_id, customer_id, employee_id, transaction_reference, status)
  VALUES (v_cycle.id, v_cycle.customer_id, p_employee_id,
          'TRX-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)), 'recorded')
  RETURNING id INTO v_tx_id;

  UPDATE "LoyaltyCycles" SET current_consumptions = current_consumptions + 1
  WHERE id = v_cycle.id
  RETURNING current_consumptions INTO v_new_count;

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

-- 4) Utiliser la récompense
CREATE OR REPLACE FUNCTION fn_apply_reward(p_reward_id UUID, p_employee_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_reward "Rewards"; v_card_id UUID; v_card_status TEXT;
  v_new_cycle_id UUID; v_new_expires TIMESTAMPTZ; v_settings_row "ProgramSettings";
BEGIN
  SELECT * INTO v_reward FROM "Rewards" WHERE id = p_reward_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'REWARD_NOT_FOUND'; END IF;
  IF v_reward.status <> 'available' THEN RAISE EXCEPTION 'REWARD_NOT_AVAILABLE'; END IF;
  IF NOW() >= v_reward.expires_at THEN RAISE EXCEPTION 'REWARD_EXPIRED'; END IF;

  SELECT card_id INTO v_card_id FROM "LoyaltyCycles" WHERE id = v_reward.cycle_id;
  SELECT status INTO v_card_status FROM "LoyaltyCards" WHERE id = v_card_id;

  UPDATE "Rewards" SET status = 'used', used_at = NOW(), used_by_employee_id = p_employee_id
  WHERE id = v_reward.id;

  UPDATE "LoyaltyCycles" SET status = 'completed', completed_at = NOW() WHERE id = v_reward.cycle_id;

  SELECT * INTO v_settings_row FROM "ProgramSettings" WHERE id = 1;
  v_new_expires := NOW() + (v_settings_row.card_validity_days || ' days')::interval;
  INSERT INTO "LoyaltyCycles" (customer_id, card_id, required_consumptions, current_consumptions, status, started_at, expires_at)
  VALUES (v_reward.customer_id, v_card_id, v_settings_row.required_consumptions, 0, 'active', NOW(), v_new_expires)
  RETURNING id INTO v_new_cycle_id;

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

-- 5) Job d'expiration
CREATE OR REPLACE FUNCTION fn_expire_jobs()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  UPDATE "LoyaltyCards" SET status = 'expired'
  WHERE status = 'active' AND card_expired(expiration_date);

  UPDATE "LoyaltyCycles" SET status = 'completed', completed_at = NOW()
  WHERE status = 'active' AND card_expired((SELECT expiration_date FROM "LoyaltyCards" WHERE "LoyaltyCards".id = "LoyaltyCycles".card_id));

  UPDATE "Rewards" SET status = 'expired'
  WHERE status = 'available' AND NOW() >= expires_at;

  INSERT INTO "AuditLogs" (employee_id, action, entity_type, details)
  VALUES (NULL, 'expire_jobs', 'System', jsonb_build_object('note', 'Job d''expiration exécuté'));

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- 6) Mise à jour des paramètres
CREATE OR REPLACE FUNCTION fn_update_settings(
  p_employee_id UUID,
  p_required_consumptions INT DEFAULT NULL,
  p_discount_percentage INT DEFAULT NULL,
  p_card_validity_days INT DEFAULT NULL,
  p_reward_validity_days INT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
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

-- 7) Corrections
CREATE OR REPLACE FUNCTION fn_correction(p_transaction_id UUID, p_justification TEXT, p_employee_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE v_tx "ConsumptionTransactions"; v_cycle_id UUID; v_new_count INT;
BEGIN
  SELECT * INTO v_tx FROM "ConsumptionTransactions" WHERE id = p_transaction_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'TX_NOT_FOUND'; END IF;
  IF v_tx.status <> 'recorded' THEN RAISE EXCEPTION 'ALREADY_CANCELLED'; END IF;

  v_cycle_id := v_tx.cycle_id;

  UPDATE "ConsumptionTransactions" SET status = 'cancelled' WHERE id = p_transaction_id;
  INSERT INTO "Corrections" (transaction_id, justification, employee_id)
  VALUES (p_transaction_id, p_justification, p_employee_id);

  UPDATE "LoyaltyCycles" SET current_consumptions = GREATEST(0, current_consumptions - 1)
  WHERE id = v_cycle_id RETURNING current_consumptions INTO v_new_count;

  UPDATE "Rewards" SET status = 'expired'
  WHERE cycle_id = v_cycle_id AND status = 'available' AND v_new_count < required_consumptions;

  INSERT INTO "AuditLogs" (employee_id, action, entity_type, entity_id, details)
  VALUES (p_employee_id, 'manual_correction', 'ConsumptionTransactions', p_transaction_id,
          jsonb_build_object('justification', p_justification, 'cycle_id', v_cycle_id, 'new_consumptions', v_new_count));

  RETURN jsonb_build_object('transaction_id', p_transaction_id, 'status', 'cancelled', 'new_consumptions', v_new_count);
END;
$$;

-- Permissions d'exécution
GRANT EXECUTE ON FUNCTION fn_create_customer(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION fn_renew_card(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION fn_add_consumption(UUID, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION fn_apply_reward(UUID, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION fn_expire_jobs() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION fn_update_settings(UUID, INT, INT, INT, INT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION fn_correction(UUID, TEXT, UUID) TO anon, authenticated, service_role;
