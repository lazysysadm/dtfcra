#!/usr/bin/env bash
# Shared by the helper scripts (source it, do not run it).
# Resolves PROJECT_DIR, DATA_DIR (pgdata, pnpm-store, uploads) and BACKUP_ROOT.
# Override with DTFCRA_DATA_DIR / DTFCRA_BACKUP_DIR, exported or set in .env.
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

_read_dotenv() {
  [ -f "$PROJECT_DIR/.env" ] || return 0
  grep -E "^$1=" "$PROJECT_DIR/.env" | tail -1 | cut -d= -f2- || true
}

DTFCRA_DATA_DIR="${DTFCRA_DATA_DIR:-$(_read_dotenv DTFCRA_DATA_DIR)}"
DTFCRA_BACKUP_DIR="${DTFCRA_BACKUP_DIR:-$(_read_dotenv DTFCRA_BACKUP_DIR)}"
DATA_DIR="${DTFCRA_DATA_DIR:-$PROJECT_DIR/.data}"
BACKUP_ROOT="${DTFCRA_BACKUP_DIR:-$PROJECT_DIR/backups}"
