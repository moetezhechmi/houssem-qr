-- =====================================================================
-- Migration 003 — Fix fn_create_employee
-- (fallback : si users_admin_create_user est absent — cas typique de certains projets Supabase)
-- =====================================================================

CREATE OR REPLACE FUNCTION fn_create_employee(
  p_admin_id UUID, p_name TEXT, p_email TEXT, p_password TEXT, p_role TEXT, p_status TEXT DEFAULT 'active'
) RETURNS JSONB LANGUAGE plpgsql VOLATILE SET search_path = public, extensions, auth AS $$
DECLARE v_id UUID; v_method TEXT; v_password_hash TEXT;
BEGIN
  IF p_role NOT IN ('server','admin') THEN RAISE EXCEPTION 'INVALID_ROLE'; END IF;
  IF trim(p_email) = '' OR trim(p_name) = '' THEN RAISE EXCEPTION 'EMPTY_FIELDS'; END IF;
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = trim(p_email)) THEN RAISE EXCEPTION 'EMAIL_EXISTS'; END IF;

  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
             WHERE n.nspname = 'public' AND p.proname = 'users_admin_create_user')
  THEN
    -- Projet Supabase avec le RPC Supabase (priorité)
    v_id := (SELECT users_admin_create_user(
        p_email := trim(p_email),
        p_password := p_password,
        p_user_metadata := jsonb_build_object('name', trim(p_name), 'role', p_role, 'status', p_status)
    ));
    v_method := 'users_admin_create_user';
  ELSE
    -- Fallback : création directe dans auth.users (hash via pgcrypto crypt)
    v_password_hash := crypt(p_password, gen_salt('bf', 10));
    v_id := gen_random_uuid();
    INSERT INTO auth.users (id, aud, role, email, encrypted_password, raw_user_meta_data, is_anonymous, email_verified_at, created_at, updated_at)
    VALUES (v_id, 'authenticated', 'authenticated', trim(p_email), v_password_hash,
            jsonb_build_object('name', trim(p_name), 'role', p_role, 'status', p_status), false, NOW(), NOW(), NOW());
    v_method := 'direct_insert';
  END IF;

  INSERT INTO "Employees" (id, role, status) VALUES (v_id, p_role, p_status);

  INSERT INTO "AuditLogs" (employee_id, action, entity_type, entity_id, details)
  VALUES (p_admin_id, 'create_employee', 'Employees', v_id, jsonb_build_object('email', trim(p_email), 'role', p_role, 'status', p_status, 'creation_method', v_method));

  RETURN jsonb_build_object('id', v_id, 'name', trim(p_name), 'email', trim(p_email), 'role', p_role, 'status', p_status);
END;
$$;
