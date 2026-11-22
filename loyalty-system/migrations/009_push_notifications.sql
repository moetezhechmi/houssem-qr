-- =====================================================================
-- Migration 009 — Notifications Push
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Abonnements Push par client/appareil
CREATE TABLE IF NOT EXISTS "PushSubscriptions" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES "Customers"(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  device_type TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (customer_id, endpoint)
);
CREATE INDEX IF NOT EXISTS idx_push_sub_customer ON "PushSubscriptions"(customer_id) WHERE is_active = true;

-- Préférences de notification par client
CREATE TABLE IF NOT EXISTS "NotificationPreferences" (
  customer_id UUID PRIMARY KEY REFERENCES "Customers"(id) ON DELETE CASCADE,
  push_enabled BOOLEAN NOT NULL DEFAULT false,
  marketing_enabled BOOLEAN NOT NULL DEFAULT false,
  reward_notifications BOOLEAN NOT NULL DEFAULT true,
  reminder_notifications BOOLEAN NOT NULL DEFAULT true,
  progress_notifications BOOLEAN NOT NULL DEFAULT true,
  card_notifications BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Historique des envois (idempotence)
CREATE TABLE IF NOT EXISTS "NotificationHistory" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES "Customers"(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES "PushSubscriptions"(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  related_reward_id UUID,
  related_card_id UUID,
  dedup_key TEXT UNIQUE
);
CREATE INDEX IF NOT EXISTS idx_notif_hist_customer ON "NotificationHistory"(customer_id, sent_at DESC);

-- Modèles de messages
CREATE TABLE IF NOT EXISTS "NotificationTemplates" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Campagnes promotionnelles admin
CREATE TABLE IF NOT EXISTS "NotificationCampaigns" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  image_url TEXT,
  target TEXT NOT NULL DEFAULT 'all',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES "Employees"(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS : service_role only (Edge Functions). Clients ne lisent pas les abonnements directement.
ALTER TABLE "PushSubscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NotificationPreferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NotificationHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NotificationTemplates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NotificationCampaigns" ENABLE ROW LEVEL SECURITY;

-- Seed templates
INSERT INTO "NotificationTemplates" (type, title, message) VALUES
  ('reward_unlocked', 'Félicitations !', 'Vous avez débloqué une réduction de 30 % sur votre prochaine commande.'),
  ('reward_reminder', 'Votre réduction expire bientôt !', 'Votre réduction de 30 % expire bientôt ! Profitez-en lors de votre prochaine visite.'),
  ('card_reminder', 'Votre carte expire bientôt', 'Votre carte de fidélité expire bientôt. Il vous reste {remaining} consommations pour obtenir votre récompense.'),
  ('progress_reminder', 'Plus que {remaining} consommations !', 'Plus que {remaining} consommations pour débloquer votre réduction de 30 % !')
ON CONFLICT DO NOTHING;