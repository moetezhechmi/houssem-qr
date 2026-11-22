# 🛒 Bieny Coffeeshop — Système digital de fidélisation (Supabase Cloud)

Système digital moderne de fidélisation pour un coffee shop traditionnel :
serveurs via navigateurs, clients via lien personnel (sans app).

## 🔧 Architecture

- **Espace CLIENT** — `/client/<token>` — lecture seule via lien personnel + Realtime (Supabase).
- **Espace SERVEUR** — `/serveur` — dashboard, recherche, fiche client, actions.
- **Espace ADMIN** — `/admin` — paramètres dynamiques, employés, corrections, audits.

| Composant | Technologie |
|---|---|
| Frontend | Next.js 15 + React 18 (ESM, TypeScript) |
| Backend (SQL) | Supabase PostgreSQL — tables, fonctions SQL |
| Auth | Supabase Auth (sessions serveurs/admin) |
| Business logic | Edge Functions Supabase (l'"Edge Functions principal") |
| Client reads | PostgREST + RLS (client en lecture seule) |
| Realtime | `supabase.channel(...).on('postgres_changes')` (API v2) |
| Fuseau horaire | `Africa/Tunis` partout (SQL + UI) |

## 📦 Déploiement des tables + fonctions

1. **Créer les tables** : Dashboard Supabase → **SQL Editor** → coller `migrations/001_schema.sql` → Run → coller `migrations/002_seed.sql` → Run.
   - (Alternative : `npx supabase db push` si vous avez un jeton d'accès)
2. **Déployer les Edge Functions** : `npx supabase functions deploy` (ou Dashboard → Edge Functions → New Function).
   - 9 fonctions : `get-client-card`, `add-consumption`, `apply-reward`, `renew-card`, `create-customer`, `admin-update-settings`, `admin-correction`, `admin-employees-create`, `admin-employees-update`, `expire-jobs`.
3. **Configurer les clés** :
   - `.env.local` (publics, requis au build) : URL + `sb_publishable_…`
   - `.env.server.local` (SECRÈRES — serveur uniquement) : `sb_secret_…` (service_role — jamais frontend, jamais commité).
4. **Créer le 1er employé admin** (chicken-egg) :
   - Dashboard Supabase → Authentication → créer un utilisateur (email/mdp).
   - Dashboard Supabase → SQL Editor → `INSERT INTO "Employees" (id, role, status) VALUES ('<id_utilisateur>', 'admin', 'active');` (rôle peut être changé plus tard via l'UI admin).
5. **Lancer** : `npm install` → `npm run dev` → [http://localhost:3100](http://localhost:3100)
   - `/serveur` → login Supabase Auth
   - `/admin` → paramètres, employés, audits
6. **Planifier `expire-jobs`** : Supabase Cron (ou appel périodique de l'Edge Function `expire-jobs`).

## 🧪 Tests (phase 6)

```bash
npm test   # Scénario Ahmed + edge cases (expirations, double usage, corrections…)
```
Requiert les tables déployées (étape 1).

## 🧹 Sécurité & conformité (résumé)

- Client en lecture seule via lien personnel (RLS + Edge Function `get-client-card` public).
- Tokens : SHA-256 stocké comme empreinte — pas de token en clair exposé aux clients.
- mutations via Edge Functions — atomicité + anti double-usage (`FOR UPDATE`).
- Carte expirée : `CARTE_EXPIRED` — aucune consommation après expiration.
- Récomponse : 30 % / 7 jours — déblocage à 9/9, utilisable 1 fois.
- Fuseau horaire **Africa/Tunis** dans SQL et UI.
- Journaux d'audit : chaque opération historisée avec l'employé concerné.

## ⚠️ Notes de conformité spec

- L'architecture est **Supabase Cloud** (PostgreSQL + Auth + Edge Functions + RLS + Realtime), tel que demandé.
- Tables PascalCase ("Customers", "LoyaltyCards", …) — conforme à la spec §8.
- Routes : client (`/client/[token]`), serveur (`/serveur/*`), admin (`/admin`) — conforme.

## 🧹 Projets supprimés (non utilisés)

- Local PostgreSQL/Prisma/Sessions/cryptées — retirés (architecture Supabase-native).

Fini. À suivre par la création des tables via Dashboard + tests.
