# Système digital de fidélisation — Bieny Coffeeshop (Supabase Cloud)

```bash
npm install
npm run dev            # Next.js dev — port 3100
npm run build          # build de production
npm run typecheck      # tsc --noEmit
npm run deploy-edge-functions   # déploiement des Edge Functions (CLI Supabase)
```

## Tests (phase 6 — scénario Ahmed + edge cases)

```bash
npm test
```

Exige que les tables soient déployées (voir `migrations/NOTES.md`) et les clés dans `.env.local` / `.env.server.local`.
