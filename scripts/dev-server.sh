#!/usr/bin/env bash
# Serveur de dev Next.js en conteneur — publié sur 127.0.0.1:3000 uniquement.
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/_env.sh"

if podman container exists dtfcra-app; then
  podman rm -f dtfcra-app >/dev/null
fi

exec podman run -d --name dtfcra-app \
  -v "$PROJECT_DIR":/app:z \
  -v "$DATA_DIR/pnpm-store":/pnpm-store:z \
  -v "$DATA_DIR/uploads":/app/uploads:z \
  --network dtfcra-net \
  --env-file "$PROJECT_DIR/.env" \
  -p 127.0.0.1:3000:3000 \
  -w /app \
  local/dtfcra-dev:26 \
  pnpm dev