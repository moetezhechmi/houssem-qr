-- =====================================================================
-- Bieny Coffeeshop – Migration 008 : Helpers de test (non-production)
-- Ces fonctions sont UNIQUEMENT pour les tests automatisés.
-- Elles permettent de simuler l'expiration sans bypass RLS.
-- =====================================================================

-- Expire artificiellement une carte (pour les tests)
CREATE OR REPLACE FUNCTION fn_test_expire_card(p_card_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  UPDATE "LoyaltyCards"
  SET expiration_date = NOW() - interval '1 second'
  WHERE id = p_card_id;

  -- Mettre à jour le cycle correspondant aussi
  UPDATE "LoyaltyCycles"
  SET expires_at = NOW() - interval '1 second'
  WHERE card_id = p_card_id AND status = 'active';
END;
$$;

-- Expire artificiellement une récompense (pour les tests)
CREATE OR REPLACE FUNCTION fn_test_expire_reward(p_reward_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  UPDATE "Rewards"
  SET expires_at = NOW() - interval '1 second'
  WHERE id = p_reward_id;
END;
$$;

-- Permissions : accessible par anon (clé publishable) pour les tests
GRANT EXECUTE ON FUNCTION fn_test_expire_card(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION fn_test_expire_reward(UUID) TO anon, authenticated, service_role;
