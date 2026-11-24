-- 010_fix_fn_update_settings.sql
-- Fix entity_id type mismatch in fn_update_settings (AuditLogs.entity_id is UUID, ProgramSettings.id is INT)

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

  -- Set entity_id to NULL because AuditLogs.entity_id is UUID while ProgramSettings has INT PK
  INSERT INTO "AuditLogs" (employee_id, action, entity_type, entity_id, details)
  VALUES (p_employee_id, 'update_settings', 'ProgramSettings', NULL, jsonb_build_object(
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

GRANT EXECUTE ON FUNCTION fn_update_settings(UUID, INT, INT, INT, INT) TO anon, authenticated, service_role;
