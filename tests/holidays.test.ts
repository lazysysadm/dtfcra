import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  easterSunday,
  getHolidays,
  isWorkingDay,
  monthDays,
  workingDaysInMonth,
} from "@/lib/holidays";
import { TERRITORIES } from "@/lib/holidays/territories";

const FIXTURES_DIR = path.join(process.cwd(), "tests/fixtures/holidays");
const YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

describe("holidays vs official API fixtures (2024–2030)", () => {
  for (const territory of TERRITORIES) {
    for (const year of YEARS) {
      it(`${territory} ${year}`, () => {
        const fixture = JSON.parse(
          readFileSync(path.join(FIXTURES_DIR, territory, `${year}.json`), "utf8"),
        ) as Record<string, string>;
        const local = getHolidays(year, territory);
        expect([...local.keys()].sort()).toEqual(Object.keys(fixture).sort());
      });
    }
  }
});

describe("easterSunday", () => {
  it("computes known Easter dates", () => {
    expect(easterSunday(2024).toISOString().slice(0, 10)).toBe("2024-03-31");
    expect(easterSunday(2025).toISOString().slice(0, 10)).toBe("2025-04-20");
    expect(easterSunday(2026).toISOString().slice(0, 10)).toBe("2026-04-05");
    expect(easterSunday(2030).toISOString().slice(0, 10)).toBe("2030-04-21");
  });
});

describe("working days", () => {
  it("excludes weekends and holidays in métropole", () => {
    // Mai 2026 : 1er mai (vendredi), 8 mai (vendredi), Ascension 14 mai (jeudi).
    expect(isWorkingDay("2026-05-01", "metropole")).toBe(false);
    expect(isWorkingDay("2026-05-08", "metropole")).toBe(false);
    expect(isWorkingDay("2026-05-14", "metropole")).toBe(false);
    expect(isWorkingDay("2026-05-04", "metropole")).toBe(true);
    expect(isWorkingDay("2026-05-02", "metropole")).toBe(false); // samedi
  });

  it("includes Good Friday in Alsace-Moselle only", () => {
    expect(isWorkingDay("2026-04-03", "alsace-moselle")).toBe(false);
    expect(isWorkingDay("2026-04-03", "metropole")).toBe(true);
  });

  it("counts working days of January 2026 (métropole)", () => {
    // 31 jours, 1er janvier férié (jeudi), week-ends : 9 jours.
    expect(monthDays(2026, 1)).toHaveLength(31);
    expect(workingDaysInMonth(2026, 1, "metropole")).toHaveLength(21);
  });
});
