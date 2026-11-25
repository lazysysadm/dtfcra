# SECURITY.md — dtfcra

Checklist de sécurité (OWASP ASVS niveau 2 visé).
État au 2026-11-24 (revue d'architecture appliquée) — périmètre réduit (pas de validation
client / signature).

## Authentification et sessions

- [x] Hachage scrypt (Better Auth 1.7.7, `hashPassword`/`verifyPassword` pour le CLI).
- [x] Mot de passe ≥ 12 caractères, ≤ 128 ; liste locale de mots de passe compromis
      (`src/lib/validation/password.ts`, hook `hooks.before` sur sign-up/change/set/reset).
- [x] Pas d'email de vérification (aucun envoi d'email).
- [x] 2FA TOTP (QR code, codes de secours, verrouillage après 10 échecs / 15 min) + passkeys WebAuthn.
- [x] Cookies `HttpOnly`, `SameSite=Lax`, `Secure` en prod ; session prod `__Host-session_token`
      (path=/, pas de Domain). Rotation à la connexion ; `revokeOtherSessions` après activation
      2FA, changement et reset de mot de passe.
- [x] Rate limiting stockage **database** : sign-in 5/min, sign-up 5/h, TOTP/backup 5/min ;
      limiteur public atomique (`public_rate_limit`) pour les routes publiques.
- [x] `ALLOW_SIGNUP=false` par défaut ; premier compte toujours autorisé ; CLI hébergeur
      `auth:create-user` / `auth:reset-password` (reset révoque toutes les sessions, audité).

## Autorisation

- [x] Contrôle d'accès côté serveur dans chaque service, filtre `userId` systématique.
- [x] Tests IDOR dédiés (référentiel, CRA, exports, audit) : utilisateur B ne peut ni lire
      ni modifier ni supprimer les données de A, ni s'y rattacher.
- [x] Identifiants UUID v7 (PG18 `uuidv7()` + `generateId` Better Auth), jamais d'auto-incrément.
- [x] Routes d'export/logo/gabarits : session obligatoire + propriété vérifiée (401/404).

## Entrées / sorties

- [x] Validation Zod de toutes les entrées (actions, routes, query params).
- [x] Requêtes uniquement via Drizzle (paramétrées), aucun SQL concaténé.
- [x] Uploads : taille max (logo 2 Mo, gabarit 5 Mo), type réel vérifié (magic bytes PNG/JPEG,
      ZIP pour xlsx), `.xlsm` et macros refusés (`vbaProject.bin`), nommage aléatoire,
      stockage hors du public (`UPLOAD_DIR`), servis via routes authentifiées, anti-traversée.

## En-têtes HTTP

- [x] CSP à nonce + `strict-dynamic` (`src/proxy.ts`), `frame-ancestors 'none'`,
      `X-Frame-Options: DENY`, HSTS en prod, `nosniff`,
      `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restrictive.
- [x] CSRF : protection native Better Auth (Origin + Fetch Metadata), `trustedOrigins`
      (APP_URL seul en prod) ; `assertOrigin()` pour les route handlers mutateurs ;
      Server Actions : vérification d'origine native Next.
- [x] `proxy.ts` (Next 16) — matcher excluant `/_next/` (ne pas casser le WebSocket HMR).

## Données et secrets

- [x] Secrets via env, validés au démarrage par Zod (`src/env.ts`) — refus de démarrer si invalide.
- [x] `.env` gitignoré ; `.env.example` = placeholders ; aucun secret dans l'image (ARG de build factices).
- [x] Logs pino structurés avec redaction (password, token, otp, signature, authorization, cookie).
- [x] `audit_log` append-only (insert + lecture filtrée `userId`, aucune route de modification/suppression).
- [x] Export RGPD JSON (sans secrets d'auth) + suppression de compte (cascades DB).

## Chaîne d'approvisionnement

- [x] `pnpm audit --audit-level=high` dans la CI ; lockfile figé (`--frozen-lockfile`).
- [x] Dépendances minimales (`autoInstallPeers: false`, builds approuvés explicitement).
- [x] Renovate avec plafonds (TS 5.x, Better Auth 1.6.x, Drizzle 0.x).
- [x] Versions épinglées vérifiées au registre (Node 26.13.1, Next 16.4.6, React 19.3.0
      aligné vendored, PG 18.7).

## Image et déploiement

- [x] `Containerfile` multi-stage `node:26-alpine`, utilisateur non-root `dtfcra`,
      `HEALTHCHECK` (build `--format docker`), `read_only: true` + tmpfs /tmp + volume uploads.
- [x] `compose.yaml` : app / db / migrate one-shot, healthchecks, `depends_on` conditionnels.
- [x] TLS via reverse proxy amont ; `TRUSTED_PROXY` (IP/CIDR) pour la vraie IP client.
- [x] Sauvegarde `pg_dump` compressé + uploads, rotation 7, **restauration testée** en conteneur éphémère.
- [x] `/api/health` sans fuite d'information (DB + migrations).

## Tests

- [x] Vitest : 171 tests (unitaires + intégration DB réelle : auth, IDOR, CRA, exports).
- [x] Playwright E2E : parcours complet inscription → client → mission → CRA → export PDF
      → archive → suppression de compte (conteneur `local/dtfcra-e2e:26`).
- [x] CI (GitHub Actions) : lint → typecheck → tests → migrations → build → audit.

## Risques acceptés / notes

- **better-auth 1.7.7 + @better-auth/passkey 1.7.7** (correctifs de sécurité) : les avis critical/high de la plage 1.6.x (OAuth state/magic link,
  device login, OAuth proxy) sont **corrigés**. `pnpm audit --prod --audit-level=high` :
  **aucune vulnérabilité connue**. Les exclusions `ignoreGhsas` temporaires ont été retirées.
  Changement d'API 1.7 : retour de `twoFactor.enable` = union typée (`method: "totp"`).
- **uuid <11.1.1** (moderate, tiré par exceljs) : **corrigé** par override `exceljs>uuid: 11.1.1`.
- Vulnérabilités **dev-only** (hors audit `--prod` de la CI) : esbuild 0.18 (moderate, chaîne
  dépréciée `@esbuild-kit` de drizzle-kit), lodash/chevrotain et better-auth ancien imbriqués
  dans `@better-auth/cli` (outil de génération de schéma, jamais exécuté en runtime).
- Signature électronique / validation client : **hors périmètre**.
- `allowedDevOrigins` (dev uniquement) pour l'accès cross-origin des conteneurs E2E.

## Durcissement appliqué (revue d'architecture du 2026-11-24)

- **CSRF** : `assertOrigin` durci (Origin étranger refusé ; sans Origin, `Sec-Fetch-Site`
  doit valoir `same-origin`/`none`) et appliqué à tous les POST via `requireApiUser`
  (`/api/templates`, `/api/profile/logo`). Tests : `tests/origin.test.ts`.
- **Ré-authentification** : suppression de compte exige le mot de passe courant
  (`verifyPassword`) ; `/api/me/export` exige une session fraîche (< 10 min).
- **Effacement RGPD** : la suppression de compte supprime aussi les fichiers uploadés
  (logo + gabarits) ; échec de suppression fichier loggué sans bloquer.
- **Injection CSV** : cellules texte commençant par `= + - @ tab CR` préfixées d'une
  apostrophe ; gabarit Excel forcé en format texte (`numFmt "@"`). Test dédié.
- **Uploads** : ZIP borné (≤ 200 entrées, ≤ 50 Mo décompressé, liens externes/OLE refusés,
  `[Content_Types].xml` + `xl/workbook.xml` requis) ; images bornées à 2000×2000.
- **Rate limiting** : `enforceRateLimit` par utilisateur sur exports (30/min), uploads
  (10/min), export RGPD (5/min) ; purge opportuniste des compteurs expirés.
- **Verrouillage progressif de connexion** (`login_lockout`) : incrémentation **atomique**
  des échecs (upsert SQL), backoff `min(2^n, 1 h)` dès 5 échecs ; purge opportuniste des
  lignes inactives > 1 jour (colonne `updated_at`). **Anti-DoS / anti-énumération** : aucune
  ligne créée pour un email inexistant ; un compte verrouillé renvoie la **même erreur
  générique** qu'un échec de connexion (pas de révélation d'existence). Compromis assumé :
  verrou max 1 h, contournable par le script hébergeur `auth:reset-password` (qui révoque
  les sessions **et** lève le verrou via `resetLoginFailures`). Tests : concurrence
  (N appels → `failures = N`), purge (ligne ancienne purgée, ligne verrouillée conservée).
- **Concurrence CRA** : `pg_advisory_xact_lock` par utilisateur + upsert différentiel +
  version optimiste (`STALE_VERSION`). Test de concurrence dédié.
- **Erreurs** : `DomainError(code, reason)` → messages FR précis ; `apiErrorResponse`
  uniforme (statuts HTTP, log pino, sans fuite) ; pages `error.tsx`/`global-error.tsx`/
  `not-found.tsx` en français.
- **Pool PG** : timeouts (connexion 5 s, idle 30 s, `statement_timeout` 15 s),
  `pool.on("error")`, pool mémorisé en dev (HMR).
- **En-têtes** : `upgrade-insecure-requests`, COOP/CORP `same-origin` et HSTS **en prod
  uniquement** (les appliquer en dev http casse la navigation cross-origin des conteneurs
  E2E) ; `Cache-Control: private, no-store` ; nonce CSP via `crypto.getRandomValues`.
- **env** : `APP_URL` doit être `https://` en production (sauf `ALLOW_INSECURE_APP_URL=true`),
  vérifié au runtime (pas au build). `TRUSTED_PROXY` absent → `X-Forwarded-For` ignoré
  (IP d'audit non usurpable).
- **Logs** : redaction profonde (`**.password`, `*.secret`, `*.code`, set-cookie) ;
  sérialiseur d'erreur retirant `parameters`/`query` (pas de valeurs SQL loguées).

## Conservation de l'audit

`audit_log` est append-only. `userId` est `text` avec FK `on delete set null` : à
l'effacement d'un compte, les lignes d'audit sont **conservées mais anonymisées**
(`userId` mis à null) pour la traçabilité légale. Les audits orphelins existants ont été
anonymisés par la migration 0009. Aucune route de modification/suppression de l'audit.
