-- =====================================================================
-- Migration 012 — Optimisation fn_get_employee_by_id
-- Retourne store_status et store_logo_url directement dans la jointure
-- =====================================================================

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
      'store_logo_url', s.logo_url,
      'store_status', s.status,
      'created_at', e.created_at) END
  FROM "Employees" e
  LEFT JOIN "Stores" s ON s.id = e.store_id
  WHERE e.id = p_user_id;
$$;
