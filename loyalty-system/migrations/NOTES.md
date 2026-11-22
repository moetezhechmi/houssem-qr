# Déploiement des migrations SQL

Ces migrations créent les tables, index, RLS et fonctions SQL.

## Via le Dashboard Supabase (recommandé, sans jeton)

1. Dashboard → SQL Editor
2. Coller `migrations/001_schema.sql` (tout) → Run
3. Coller `migrations/002_seed.sql` → Run

## Via CLI (si vous avez un jeton d'accès Supabase)

```bash
npx supabase db push --local=false
```
Ou avec le CLI configuré (projet : `nherdvalokgjjmpvpsyr`).

## Vérification

Vérifiez que les tables existent via PostgREST :
```
GET https://nherdvalokgjjmpvpsyr.supabase.co/rest/v1/Customers?limit=1
GET https://nherdvalokgjjmpvpsyr.supabase.co/rest/v1/LoyaltyCards?limit=1
```

Note : les fonctions SQL `fn_*` sont appelées depuis les Edge Functions (qui ont accès service_role).
Le client (page client) n'a accès qu'à `get-client-card` (public) + RLS lecture.
