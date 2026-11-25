# Licences des dépendances

dtfcra est publié sous **licence MIT** (`LICENSE`). Audit du 2026-11-25 réalisé avec
`pnpm licenses list` (dépendances de production **et** de développement, 2 versions de
`better-auth` incluses).

**Verdict : compatible MIT.** Aucune dépendance copyleft fort (GPL/AGPL) n'est imposée.

| Licence                                                                                                         | Paquets                    | Remarque                                                                                                                                                                                                                                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MIT, ISC, BSD-2/3, 0BSD, Apache-2.0, BlueOak-1.0.0, Unlicense, CC0-1.0                                          | ~390 (très large majorité) | Permissives, compatibles. Apache-2.0 : conserver les mentions NOTICE si on redistribue.                                                                                                                                                                                                                                                                   |
| `(MIT OR GPL-3.0-or-later)` — `jszip`                                                                           | 1                          | Double licence : on retient **MIT**.                                                                                                                                                                                                                                                                                                                      |
| `(MIT OR WTFPL)` — `expand-template` ; `(BSD-2-Clause OR MIT OR Apache-2.0)` — `rc` ; `(MIT AND Zlib)` — `pako` | 3                          | Permissives.                                                                                                                                                                                                                                                                                                                                              |
| `MIT/X11` — `chainsaw` ; licence non déclarée dans le `package.json` — `buffers` 0.1.1                          | 2                          | `buffers` : README « MIT/X11 ». Dépendance transitive d'`exceljs` (via `unzipper`).                                                                                                                                                                                                                                                                       |
| `CC-BY-4.0` — `caniuse-lite`                                                                                    | 1                          | Données (outillage de build), attribution suffisante.                                                                                                                                                                                                                                                                                                     |
| `MPL-2.0` — `axe-core`, `lightningcss`                                                                          | 3                          | Copyleft **au niveau du fichier** uniquement ; outillage de dev/build, non modifié, non redistribué dans l'image. Compatible.                                                                                                                                                                                                                             |
| `LGPL-3.0-or-later` — `@img/sharp-libvips-linuxmusl-x64`                                                        | 1                          | Binaire natif lié dynamiquement par `sharp` (dépendance **optionnelle** de Next.js, optimisation d'images, non utilisée par dtfcra). Compatible en lien dynamique ; si vous redistribuez une image conteneur, joignez le texte de la LGPL et la source/offre de source de libvips, ou retirez `sharp` (`pnpm remove sharp` / `images.unoptimized: true`). |

Polices : `@react-pdf/renderer` utilise Helvetica intégrée (aucune police tierce embarquée).

## Régénérer

```bash
./scripts/dev-run.sh pnpm licenses list --json
```

Relancer l'audit à chaque mise à jour majeure de dépendances.
