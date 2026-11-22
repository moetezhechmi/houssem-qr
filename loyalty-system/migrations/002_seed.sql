-- Migration 002 — Seeds (lignes par défaut du programme, idempotent)

INSERT INTO "ProgramSettings" (required_consumptions, discount_percentage, card_validity_days, reward_validity_days)
VALUES (9, 30, 30, 7)
ON CONFLICT (id) DO NOTHING;
