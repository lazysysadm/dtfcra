#!/usr/bin/env bash
# Exécute une commande dans le conteneur de dev dtfcra (projet monté, rien sur l'hôte).
# Usage : ./scripts/dev-run.sh pnpm install | pnpm test | pnpm build | sh
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/_env.sh"

exec podman run --rm \
  -v "$PROJECT_DIR":/app:z \
  -v "$DATA_DIR/pnpm-store":/pnpm-store:z \
  -v "$DATA_DIR/uploads":/app/uploads:z \
  --network dtfcra-net \
  --env-file "$PROJECT_DIR/.env" \
  -w /app \
  local/dtfcra-dev:26 \
  "$@"