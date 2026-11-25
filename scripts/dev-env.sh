#!/usr/bin/env bash
# dtfcra dev environment — Podman rootless uniquement, rien sur l'OS hôte.
# Données persistantes : $DTFCRA_DATA_DIR (défaut : ./.data)
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/_env.sh"
IMAGE="local/dtfcra-dev:26"
NETWORK="dtfcra-net"
DB_CONTAINER="dtfcra-db"

cmd="${1:-status}"

ensure_env_file() {
  if [[ ! -f "$PROJECT_DIR/.env" ]]; then
    echo "Missing .env — copy .env.example to .env and fill in secrets." >&2
    exit 1
  fi
}

up() {
  ensure_env_file
  set -a
  # shellcheck disable=SC1091
  source "$PROJECT_DIR/.env"
  set +a
  mkdir -p "$DATA_DIR/pgdata" "$DATA_DIR/pnpm-store" "$DATA_DIR/uploads"
  podman network exists "$NETWORK" || podman network create "$NETWORK" >/dev/null
  podman image exists "$IMAGE" || podman build -f "$PROJECT_DIR/Containerfile.dev" -t "$IMAGE" "$PROJECT_DIR"
  if podman container exists "$DB_CONTAINER"; then
    podman start "$DB_CONTAINER" >/dev/null 2>&1 || true
  else
    podman run -d --name "$DB_CONTAINER" \
      --network "$NETWORK" \
      -e POSTGRES_USER=dtfcra \
      -e POSTGRES_DB=dtfcra \
      -e POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
      -v "$DATA_DIR/pgdata:/var/lib/postgresql:Z" \
      docker.io/library/postgres:18-alpine >/dev/null
  fi
  echo "Waiting for PostgreSQL..."
  for _ in $(seq 1 30); do
    if podman exec "$DB_CONTAINER" pg_isready -U dtfcra -d dtfcra >/dev/null 2>&1; then
      echo "PostgreSQL ready (container: $DB_CONTAINER, network: $NETWORK)."
      return 0
    fi
    sleep 1
  done
  echo "PostgreSQL did not become ready in time." >&2
  exit 1
}

down() {
  for c in dtfcra-app "$DB_CONTAINER"; do
    if podman container exists "$c"; then
      podman stop "$c" >/dev/null 2>&1 || true
    fi
  done
  echo "Dev containers stopped (data preserved in $DATA_DIR)."
}

status() {
  podman ps -a --filter "name=dtfcra" --format "{{.Names}}: {{.Status}}"
}

case "$cmd" in
  up) up ;;
  down) down ;;
  status) status ;;
  *)
    echo "Usage: $0 {up|down|status}" >&2
    exit 1
    ;;
esac