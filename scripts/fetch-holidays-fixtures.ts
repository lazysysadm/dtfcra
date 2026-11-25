// Fetch official holiday fixtures (committed) — run manually, never at app runtime.
// Usage: node --import tsx scripts/fetch-holidays-fixtures.ts
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { TERRITORIES } from "../src/lib/holidays/territories";

const YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

async function main() {
  for (const zone of TERRITORIES) {
    const dir = path.join("tests/fixtures/holidays", zone);
    await mkdir(dir, { recursive: true });
    for (const year of YEARS) {
      const url = `https://calendrier.api.gouv.fr/jours-feries/${zone}/${year}.json`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`${url} → HTTP ${response.status}`);
      }
      const data = (await response.json()) as Record<string, string>;
      await writeFile(path.join(dir, `${year}.json`), `${JSON.stringify(data, null, 2)}\n`);
      console.log(`${zone}/${year}: ${Object.keys(data).length} jours`);
    }
  }
  console.log("Fixtures enregistrées dans tests/fixtures/holidays/");
}

main().catch((error: unknown) => {
  console.error("Échec de la récupération des fixtures :", error);
  process.exit(1);
});
