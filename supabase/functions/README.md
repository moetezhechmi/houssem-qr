# Bieny Coffeeshop — Fonctions Edge Supabase (Supabase Cloud)

Les Edge Functions exécutent la logique métier sécurisée.

## Fonctions disponibles (10) — fichiers dans `supabase/functions/*.ts`

| Fonction | Usage |
|---|---|
| `get-client-card` | Fiche client (public, lecture seule) — URL `/client/<token>` |
| `add-consumption` | Ajoute une consommation (serveur/admin) — débloque la récompense à 9/9 |
| `apply-reward` | Utilise la récomponse débloquée (serveur/admin) |
| `renew-card` | Crée une nouvelle carte pour un client expiré (serveur/admin) |
| `create-customer` | Crée un client + sa première carte (serveur/admin) |
| `admin-update-settings` | Mise à jour des paramètres dynamiques (admin) |
| `admin-correction` | Annule une consommation avec justification (admin) |
| `admin-employees-create` / `admin-employees-update` | Gestion des employés (admin) |
| `expire-jobs` | Job d'expiration (cron) |

Chaque fonction est **autonome** (contient ses helpers inline) — idéal pour le Dashboard.

## Env (à configurer dans Dashboard → Edge Functions → Settings → Environment Variables)

- `SUPABASE_URL` — `https://nherdvalokgjjmpvpsyr.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` — jeton service_role (à fournir SEULEMENT au Backend — jamais dans le code)
- `SUPABASE_PUBLISHABLE_KEY` — clé publishable (falls back pour `getEmployeeFromToken`)

## Déploiement via Dashboard (sans jeton)

1. Dashboard → **Edge Functions** → **New Function**
2. Pour chacune des 10 fonctions (dans cet ordre si vous voulez):
   - **Name** = nom du fichier (ex: `add-consumption`)
   - **Code** = coller intégralement le contenu de `supabase/functions/<nom>.ts`
   - **Create**
3. Répéter pour les 10 fonctions.

## Déploiement via CLI

Si vous avez un jeton d'accès Supabase : `npx supabase functions deploy`

## Idempotence & sécurité

- Récompenses utilisables une seule fois (`FOR UPDATE` sur `Rewards`).
- Cartes expirées : `CARTE_EXPIRED` bloquant les consommations.
- Tokens clients : SHA-256 stocké comme empreinte.
- Client en lecture seule via les politiques RLS + Edge Functions.

## Vérifications

Après déploiement, testez : `POST https://nherdvalokgjjmpvpsyr.supabase.co/functions/v1/get-client-card` avec un `token_hash` valide.
