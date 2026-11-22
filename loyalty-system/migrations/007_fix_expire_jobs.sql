-- =====================================================================
-- Bieny Coffeeshop — Migration 007 : Fix fn_expire_jobs
-- Problème : card_expired() compare la DATE calendaire (Africa/Tunis),
-- donc une carte expirée à "il y a 1 seconde mais aujourd'hui" n'est
-- pas détectée. fn_expire_jobs doit aussi comparer NOW() > expiration_date.
-- =====================================================================

-- Fix de fn_expire_jobs : double condition (date ET timestamp)
CREATE OR REPLACE FUNCTION fn_expire_jobs()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  -- Cartes expirées : date calendaire OU timestamp déjà passé
  UPDATE "LoyaltyCards" SET status = 'expired'
  WHERE status = 'active'
    AND (card_expired(expiration_date) OR NOW() > expiration_date);

  -- Cycles expirés
  UPDATE "LoyaltyCycles" SET status = 'completed', completed_at = NOW()
  WHERE status = 'active'
    AND (
      card_expired((SELECT expiration_date FROM "LoyaltyCards" WHERE "LoyaltyCards".id = "LoyaltyCycles".card_id))
      OR NOW() > (SELECT expiration_date FROM "LoyaltyCards" WHERE "LoyaltyCards".id = "LoyaltyCycles".card_id)
    );

  -- Récompenses expirées
  UPDATE "Rewards" SET status = 'expired'
  WHERE status = 'available' AND NOW() >= expires_at;

  INSERT INTO "AuditLogs" (employee_id, action, entity_type, details)
  VALUES (NULL, 'expire_jobs', 'System', jsonb_build_object('note', 'Job d''expiration exécuté'));

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Fix de fn_add_consumption et fn_renew_card : accepter les expirations timestamp aussi
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
  -- Carte active : non expirée (date calendaire OU timestamp)
  SELECT id INTO v_cardid FROM "LoyaltyCards"
  WHERE id = p_card_id AND status = 'active'
    AND NOT card_expired(expiration_date)
    AND NOW() <= expiration_date
  LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'CARTE_EXPIRED'; END IF;

  SELECT c.* INTO v_cycle
  FROM "LoyaltyCycles" c
  WHERE c.card_id = v_cardid AND c.status = 'active'
    AND NOT card_expired(c.expires_at)
    AND NOW() <= c.expires_at
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
    VALUES (p_employee_id, 'unlock_reward', 'Rewards', v_reward_id,
            jsonb_build_object('cycle_id', v_cycle.id, 'discount_percentage', v_settings_row.discount_percentage));
  END IF;

  INSERT INTO "AuditLogs" (employee_id, action, entity_type, entity_id, details)
  VALUES (p_employee_id, 'add_consumption', 'ConsumptionTransactions', v_tx_id,
          jsonb_build_object('card_id', p_card_id, 'cycle_id', v_cycle.id,
                             'current_consumptions', v_new_count, 'required_consumptions', v_cycle.required_consumptions));

  RETURN jsonb_build_object(
    'transaction_id', v_tx_id,
    'cycle', jsonb_build_object('id', v_cycle.id, 'current_consumptions', v_new_count,
                                'required_consumptions', v_cycle.required_consumptions),
    'reward_unlocked', v_reward_id IS NOT NULL
  );
END;
$$;

-- Fix fn_renew_card : accepter aussi les cartes expirées par timestamp
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
  -- Vérifier qu'il n'y a pas de carte active valide (date ET timestamp)
  IF EXISTS (
    SELECT 1 FROM "LoyaltyCards"
    WHERE customer_id = p_customer_id
      AND status = 'active'
      AND NOT card_expired(expiration_date)
      AND NOW() <= expiration_date
  ) THEN RAISE EXCEPTION 'CARD_ALREADY_ACTIVE'; END IF;

  -- Archiver les cartes expirées
  UPDATE "LoyaltyCards" SET status = 'expired'
  WHERE customer_id = p_customer_id AND status = 'active'
    AND (card_expired(expiration_date) OR NOW() > expiration_date);

  UPDATE "LoyaltyCards" SET status = 'archived'
  WHERE customer_id = p_customer_id AND status = 'expired';

  SELECT * INTO v_settings_row FROM "ProgramSettings" WHERE id = 1;
  v_public_token := 'lc_' || replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

  INSERT INTO "LoyaltyCards" (customer_id, card_number, public_token, token_hash, start_date, expiration_date, status)
  VALUES (p_customer_id, 'CLI-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)), v_public_token,
          encode(sha256(v_public_token::bytea), 'hex'), NOW(),
          NOW() + (v_settings_row.card_validity_days || ' days')::interval, 'active')
  RETURNING * INTO v_card;

  INSERT INTO "LoyaltyCycles" (customer_id, card_id, required_consumptions, current_consumptions, status, started_at, expires_at)
  VALUES (p_customer_id, v_card.id, v_settings_row.required_consumptions, 0, 'active', v_card.start_date, v_card.expiration_date);

  INSERT INTO "AuditLogs" (employee_id, action, entity_type, entity_id, details)
  VALUES (NULL, 'renew_card', 'LoyaltyCards', v_card.id,
          jsonb_build_object('card_number', v_card.card_number, 'link', '/client/' || v_public_token));

  RETURN jsonb_build_object('card', jsonb_build_object(
    'id', v_card.id, 'card_number', v_card.card_number,
    'status', v_card.status, 'start_date', v_card.start_date,
    'expiration_date', v_card.expiration_date
  ));
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION fn_expire_jobs() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION fn_add_consumption(UUID, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION fn_renew_card(UUID) TO anon, authenticated, service_role;
