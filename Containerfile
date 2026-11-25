# Image de PRODUCTION multi-stage (compatible Podman / Docker).
# Dev : voir Containerfile.dev et scripts/dev-*.sh.

FROM docker.io/library/node:26-alpine AS deps
WORKDIR /app
RUN npm install -g pnpm@12.23.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM docker.io/library/node:26-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@12.23.0
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Valeurs factices de build (env.ts valide au prerender) ; les vraies valeurs
# sont fournies au runtime par compose / l'environnement. Ne jamais mettre de
# vrai secret ici.
ARG DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
ARG BETTER_AUTH_SECRET=build_secret_0123456789abcdef0123456789abcdef
ARG APP_URL=http://127.0.0.1:3000
RUN pnpm build

FROM docker.io/library/node:26-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup -S dtfcra && adduser -S dtfcra -G dtfcra \
    && npm install -g tsx@4.23.15
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/src/server/db/migrations ./src/server/db/migrations
COPY --from=builder /app/scripts/migrate.ts ./scripts/migrate.ts
RUN mkdir -p /app/uploads && chown -R dtfcra:dtfcra /app
USER dtfcra
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "server.js"]