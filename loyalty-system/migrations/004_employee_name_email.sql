-- =====================================================================
-- Migration 004 — Stocker name/email dans "Employees" et lire depuis la table
--                    (évite les reads auth.users verrouillés pour anon)
-- =====================================================================

ALTER TABLE "Employees" ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
ALTER TABLE "Employees" ADD COLUMN IF NOT EXISTS email TEXT NOT NULL DEFAULT '';

-- 1) fn_get_employee_by_id — lecture pure depuis "Employees" (pas auth.users)
CREATE OR REPLACE FUNCTION fn_get_employee_by_id(p_user_id UUID)
RETURNS JSONB LANGUAGE sql STABLE AS $$
  SELECT CASE WHEN e IS NULL THEN NULL ELSE jsonb_build_object(
      'id', e.id, 'role', e.role, 'status', e.status,
      'name', e.name, 'email', e.email, 'created_at', e.created_at) END
  FROM "Employees" e WHERE e.id = p_user_id;
$$;

-- 2) fn_get_employees — lecture depuis "Employees"
CREATE OR REPLACE FUNCTION fn_get_employees()
RETURNS SETOF jsonb LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object(
           'id', e.id, 'name', e.name, 'email', e.email,
           'role', e.role, 'status', e.status, 'created_at', e.created_at)
  FROM "Employees" e
  ORDER BY e.name, e.email;
$$;

-- 3) fn_get_serveur_fiche — LEFT JOIN vers "Employees" au lieu de auth.users
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
      FROM "ConsumptionTransactions" t LEFT JOIN "Employees" e ON e.id = t.employee_id
      WHERE t.customer_id = p_customer_id)
  );
END;
$$;

-- 4) fn_create_employee — ajoute name/email dans "Employees" (fallback sans users_admin_create_user)
CREATE OR REPLACE FUNCTION fn_create_employee(
  p_admin_id UUID, p_name TEXT, p_email TEXT, p_password TEXT, p_role TEXT, p_status TEXT DEFAULT 'active'
) RETURNS JSONB LANGUAGE plpgsql VOLATILE SET search_path = public, extensions, auth AS $$
DECLARE v_id UUID; v_method TEXT; v_password_hash TEXT;
BEGIN
  IF p_role NOT IN ('server','admin') THEN RAISE EXCEPTION 'INVALID_ROLE'; END IF;
  IF trim(p_email) = '' OR trim(p_name) = '' THEN RAISE EXCEPTION 'EMPTY_FIELDS'; END IF;
  IF EXISTS (SELECT 1 FROM "Employees" WHERE email = trim(p_email)) THEN RAISE EXCEPTION 'EMAIL_EXISTS'; END IF;

  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
             WHERE n.nspname = 'public' AND p.proname = 'users_admin_create_user')
  THEN
    v_id := (SELECT users_admin_create_user(
        p_email := trim(p_email), p_password := p_password,
        p_user_metadata := jsonb_build_object('name', trim(p_name), 'role', p_role, 'status', p_status)
    ));
    v_method := 'users_admin_create_user';
  ELSE
    v_password_hash := crypt(p_password, gen_salt('bf', 10));
    v_id := gen_random_uuid();
    INSERT INTO auth.users (id, aud, role, email, encrypted_password, raw_user_meta_data, is_anonymous, email_verified_at, created_at, updated_at)
    VALUES (v_id, 'authenticated', 'authenticated', trim(p_email), v_password_hash,
            jsonb_build_object('name', trim(p_name), 'role', p_role, 'status', p_status), false, NOW(), NOW(), NOW());
    v_method := 'direct_insert';
  END IF;

  -- Stocke name/email dans notre table "Employees" (utilisé par les interfaces, pas par auth)
  INSERT INTO "Employees" (id, role, status, name, email)
  VALUES (v_id, p_role, p_status, trim(p_name), trim(p_email));

  INSERT INTO "AuditLogs" (employee_id, action, entity_type, entity_id, details)
  VALUES (p_admin_id, 'create_employee', 'Employees', v_id, jsonb_build_object('email', trim(p_email), 'role', p_role, 'status', p_status, 'creation_method', v_method));

  RETURN jsonb_build_object('id', v_id, 'name', trim(p_name), 'email', trim(p_email), 'role', p_role, 'status', p_status);
END;
$$;
