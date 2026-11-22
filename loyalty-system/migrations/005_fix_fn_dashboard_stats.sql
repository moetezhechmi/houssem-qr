-- =====================================================================
-- Migration 005 — Fix fn_dashboard_stats
-- (le SELECT externe a un ORDER BY + LIMIT non valide sur une query agrégée)
-- =====================================================================

CREATE OR REPLACE FUNCTION fn_dashboard_stats()
RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN jsonb_build_object(
    'total_clients', (SELECT count(*) FROM "Customers"),
    'active_cards', (SELECT count(*) FROM "LoyaltyCards" WHERE status = 'active' AND NOT card_expired(expiration_date)),
    'expired_cards', (SELECT count(*) FROM "LoyaltyCards" WHERE status = 'expired'),
    'pending_rewards', (SELECT count(*) FROM "Rewards" WHERE status = 'available' AND NOW() < expires_at),
    'used_rewards', (SELECT count(*) FROM "Rewards" WHERE status = 'used'),
    'recent_operations', (
      SELECT COALESCE(jsonb_agg(h ORDER BY h.created_at DESC), '[]'::jsonb)
      FROM (SELECT * FROM "AuditLogs" ORDER BY created_at DESC LIMIT 12) h
    )
  );
END;
$$;
