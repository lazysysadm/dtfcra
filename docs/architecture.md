# Architecture — dtfcra

App web auto-hébergée de CRA / timesheets (Next.js 16 App Router, PostgreSQL 18, Drizzle).

## Couches

```
UI (src/app, src/components)
   │  Server Components : lecture via services ; formulaires → Server Actions
   ▼
Server Actions (src/server/actions)      Route handlers (src/app/api)
   │  requireUser / requireApiUser → Zod → service → résultat typé
   ▼
Services (src/server/services)           ← seule couche qui accède à la DB
   │  filtre userId systématique, DomainError(code, reason), audit append-only
   ▼
DB (src/server/db)  Drizzle + pg Pool    ← migrations versionnées (drizzle-kit)
```

- **Auth** : Better Auth 1.7.7 (`src/server/auth`), handler `api/auth/[...all]`,
  `proxy.ts` (en-têtes de sécurité + CSP à nonce).
- **Saisie CRA** : `services/timesheets.ts` — transaction + `pg_advisory_xact_lock`
  par utilisateur, upsert différentiel, version optimiste (`updatedAt`).
- **Exports** : `services/exports.ts` + `server/pdf`, `server/excel` (PDF/Excel/CSV/gabarit).
  Les montants ne figurent **jamais** dans les exports (interface uniquement).
- **Uploads** : `services/uploads.ts` — magic bytes, bornes ZIP/images, hors `public/`,
  noms aléatoires, anti path-traversal.
- **Rate limiting** : `services/rate-limit.ts` (compteurs PostgreSQL par utilisateur).

## Règles

- Toute requête filtrée par `userId` ; parent vérifié avant création d'enfant (IDOR).
- Zod sur toutes les entrées ; Drizzle paramétré (aucun SQL concaténé).
- Montants en centimes ; UUID v7 ; jours en type `date`.
- UI en français, code/commentaires en anglais, fichiers < 300 lignes.
- Tout s'exécute en conteneurs Podman (`scripts/dev-*.sh`) ; aucun git sans demande.
