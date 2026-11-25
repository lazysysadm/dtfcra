import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  computeTotals,
  dayTotal,
  nextQuantity,
  validateEntry,
  type EntryLike,
  type EntryType,
} from "@/lib/timesheet";

const TYPES: EntryType[] = ["worked", "remote", "onsite", "on_call", "leave", "unavailable"];
const mission = { tjmCents: 50000, unit: "day" as const, hoursPerDay: 7 };

const entryArb = fc.record({
  date: fc.constant("2026-01-05"),
  quantity: fc.constantFrom(0, 0.25, 0.5, 1),
  type: fc.constantFrom(...TYPES),
  comment: fc.constant(null),
});

describe("property: computeTotals", () => {
  it("billable days are non-negative and amount matches TJM × days", () => {
    fc.assert(
      fc.property(fc.array(entryArb, { maxLength: 31 }), (entries) => {
        const totals = computeTotals(entries, mission);
        expect(totals.billableDays).toBeGreaterThanOrEqual(0);
        expect(totals.amountCents).toBe(Math.round(mission.tjmCents * totals.billableDays));
        expect(totals.halfDays).toBeLessThanOrEqual(entries.length);
      }),
    );
  });

  it("leave and unavailable never contribute to billable days", () => {
    fc.assert(
      fc.property(
        fc.array(entryArb, { maxLength: 31 }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        (entries, quantity) => {
          const withLeave = computeTotals(
            [...entries, { date: "2026-01-06", quantity, type: "leave", comment: null }],
            mission,
          );
          const base = computeTotals(entries, mission);
          expect(withLeave.billableDays).toBe(base.billableDays);
        },
      ),
    );
  });
});

describe("property: dayTotal", () => {
  it("ignores leave/unavailable and sums counted types", () => {
    fc.assert(
      fc.property(fc.array(entryArb, { maxLength: 31 }), (entries) => {
        const total = dayTotal(entries, mission);
        const expected = entries
          .filter((entry) => entry.type !== "leave" && entry.type !== "unavailable")
          .reduce((sum, entry) => sum + entry.quantity, 0);
        expect(total).toBeCloseTo(expected, 9);
      }),
    );
  });
});

describe("property: nextQuantity", () => {
  it("always lands on 0, 0.5 or 1", () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 2, noNaN: true }), (current) => {
        expect([0, 0.5, 1]).toContain(nextQuantity(current));
      }),
    );
  });
});

describe("property: validateEntry (day mode)", () => {
  const period = new Set(["2026-01-05"]);

  it("accepts exactly the quarter-day grid", () => {
    fc.assert(
      fc.property(fc.constantFrom(0, 0.25, 0.5, 1), (quantity) => {
        const entry: EntryLike = { date: "2026-01-05", quantity, type: "worked", comment: null };
        expect(validateEntry(entry, "day", period)).toBeNull();
      }),
    );
  });

  it("rejects any quantity above 1", () => {
    fc.assert(
      fc.property(fc.double({ min: 1.01, max: 24, noNaN: true }), (quantity) => {
        const entry: EntryLike = { date: "2026-01-05", quantity, type: "worked", comment: null };
        expect(validateEntry(entry, "day", period)).toBe("INVALID_QUANTITY");
      }),
    );
  });
});
