#!/usr/bin/env bash
# Sauvegarde dtfcra (dev) : pg_dump compressé + uploads, rotation 7 sauvegardes.
# Destination : $DTFCRA_BACKUP_DIR (défaut : ./backups).
# En production (compose) : podman-compose exec db pg_dump -U dtfcra -d dtfcra
#   --format=custom --compress=6 > dtfcra.dump  (puis copier le volume uploads).
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/_env.sh"
DEST_ROOT="$BACKUP_ROOT"
STAMP="$(date +%Y%m%d_%H%M%S)"
DEST="$DEST_ROOT/$STAMP"

mkdir -p "$DEST"
podman exec dtfcra-db pg_dump -U dtfcra -d dtfcra --format=custom --compress=6 > "$DEST/dtfcra.dump"
tar -czf "$DEST/uploads.tar.gz" -C "$DATA_DIR" uploads
echo "Sauvegarde écrite : $DEST"

# Rotation : conserve les 7 plus récentes. Suppression fichier par fichier
# (rm) puis rmdir — jamais de rm -rf.
ls -dt "$DEST_ROOT"/*/ 2>/dev/null | tail -n +8 | while read -r old; do
  find "$old" -type f -exec rm {} +
  find "$old" -depth -type d -exec rmdir {} + 2>/dev/null || true
  echo "Ancienne sauvegarde retirée : $old"
done