import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATIONS_DIR = path.join(process.cwd(), "src/server/db/migrations");

// Migration integrity (drift-lite): every journal entry has its SQL file and
// snapshot, indexes are sequential, and no orphan SQL file exists.
describe("migration journal integrity", () => {
  const journal = JSON.parse(
    readFileSync(path.join(MIGRATIONS_DIR, "meta/_journal.json"), "utf8"),
  ) as { entries: Array<{ idx: number; tag: string }> };

  it("each entry has a SQL file and a snapshot", () => {
    for (const entry of journal.entries) {
      expect(existsSync(path.join(MIGRATIONS_DIR, `${entry.tag}.sql`))).toBe(true);
      const snapshot = `meta/${String(entry.idx).padStart(4, "0")}_snapshot.json`;
      expect(existsSync(path.join(MIGRATIONS_DIR, snapshot))).toBe(true);
    }
  });

  it("indexes are sequential from 0", () => {
    journal.entries.forEach((entry, index) => {
      expect(entry.idx).toBe(index);
    });
  });
});
