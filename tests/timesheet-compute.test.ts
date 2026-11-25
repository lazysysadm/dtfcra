import { describe, expect, it } from "vitest";
import {
  computeTotals,
  dayTotal,
  exceedsDayLimit,
  nextQuantity,
  validateEntry,
  type EntryLike,
} from "@/lib/timesheet";

const dayMission = { tjmCents: 50000, unit: "day" as const, hoursPerDay: 7 };
const hourMission = { tjmCents: 70000, unit: "hour" as const, hoursPerDay: 7 };

function entry(date: string, quantity: number, type: EntryLike["type"] = "worked"): EntryLike {
  return { date, quantity, type, comment: null };
}

describe("computeTotals", () => {
  it("counts billable days, half-days, on-call and amount (day mode)", () => {
    const entries = [
      entry("2026-01-05", 1),
      entry("2026-01-06", 0.5, "remote"),
      entry("2026-01-07", 1, "onsite"),
      entry("2026-01-08", 0.5, "on_call"),
      entry("2026-01-09", 1, "leave"),
    ];
    const totals = computeTotals(entries, dayMission);
    expect(totals.billableDays).toBe(2.5);
    expect(totals.halfDays).toBe(1);
    expect(totals.onCallDays).toBe(0.5);
    expect(totals.leaveDays).toBe(1);
    expect(totals.amountCents).toBe(125000);
  });

  it("converts hours to day equivalents (hour mode)", () => {
    const entries = [entry("2026-01-05", 7), entry("2026-01-06", 3.5, "remote")];
    const totals = computeTotals(entries, hourMission);
    expect(totals.billableDays).toBe(1.5);
    expect(totals.amountCents).toBe(105000);
  });

  it("returns zeros for an empty month", () => {
    const totals = computeTotals([], dayMission);
    expect(totals.billableDays).toBe(0);
  });
});

describe("daily cap", () => {
  it("sums counted types only (leave excluded)", () => {
    const entries = [
      entry("2026-01-05", 0.5),
      entry("2026-01-05", 0.5, "on_call"),
      entry("2026-01-05", 1, "leave"),
    ];
    expect(dayTotal(entries, dayMission)).toBe(1);
  });

  it("converts hour mode before summing", () => {
    expect(dayTotal([entry("2026-01-05", 7)], hourMission)).toBe(1);
    expect(exceedsDayLimit(dayTotal([entry("2026-01-05", 8)], hourMission))).toBe(true);
  });

  it("blocks totals above 1 day", () => {
    expect(exceedsDayLimit(1)).toBe(false);
    expect(exceedsDayLimit(1.25)).toBe(true);
  });
});

describe("nextQuantity (click cycle)", () => {
  it("cycles 1 → 0.5 → 0 → 1", () => {
    expect(nextQuantity(0)).toBe(1);
    expect(nextQuantity(1)).toBe(0.5);
    expect(nextQuantity(0.5)).toBe(0);
  });
});

describe("validateEntry (pure)", () => {
  const period = new Set(["2026-01-05", "2026-01-06"]);
  const base: EntryLike = { date: "2026-01-05", quantity: 1, type: "worked", comment: null };

  it("accepts valid day quantities", () => {
    for (const quantity of [0, 0.25, 0.5, 1]) {
      expect(validateEntry({ ...base, quantity }, "day", period)).toBeNull();
    }
  });

  it("rejects out-of-month dates", () => {
    expect(validateEntry({ ...base, date: "2026-02-01" }, "day", period)).toBe("OUT_OF_MONTH");
  });

  it("rejects invalid day quantities", () => {
    expect(validateEntry({ ...base, quantity: 0.3 }, "day", period)).toBe("INVALID_QUANTITY");
    expect(validateEntry({ ...base, quantity: 1.5 }, "day", period)).toBe("INVALID_QUANTITY");
  });

  it("allows fractional hours in hour mode", () => {
    expect(validateEntry({ ...base, quantity: 3.5 }, "hour", period)).toBeNull();
  });
});
