#!/usr/bin/env bash
# Restauration dtfcra depuis une sauvegarde scripts/backup.sh.
# Usage : scripts/restore.sh <dossier_sauvegarde> [conteneur_db]
# ATTENTION : --clean --if-exists remplace les objets existants de la base
# cible. Ne lancer que sur la base voulue (par défaut dtfcra-db, le dev).
set -euo pipefail

DIR="${1:?Usage: scripts/restore.sh <dossier_sauvegarde> [conteneur_db]}"
TARGET="${2:-dtfcra-db}"
source "$(dirname "${BASH_SOURCE[0]}")/_env.sh"

if [[ ! -f "$DIR/dtfcra.dump" ]]; then
  echo "Sauvegarde introuvable : $DIR/dtfcra.dump" >&2
  exit 1
fi

podman exec -i "$TARGET" pg_restore -U dtfcra -d dtfcra --clean --if-exists < "$DIR/dtfcra.dump"
if [[ -f "$DIR/uploads.tar.gz" ]]; then
  tar -xzf "$DIR/uploads.tar.gz" -C "$DATA_DIR"
fi
echo "Restauration terminée depuis $DIR vers $TARGET."