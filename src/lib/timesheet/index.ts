// Pure CRA computations — no DB, no network. Shared by server and client.

export type EntryType = "worked" | "remote" | "onsite" | "on_call" | "leave" | "unavailable";

export const ENTRY_TYPES: EntryType[] = [
  "worked",
  "remote",
  "onsite",
  "on_call",
  "leave",
  "unavailable",
];

export const ENTRY_TYPE_LABELS: Record<EntryType, string> = {
  worked: "Travaillé",
  remote: "Télétravail",
  onsite: "Sur site",
  on_call: "Astreinte",
  leave: "Congé",
  unavailable: "Absent",
};

// Types counted as billable work (on_call tracked separately).
export const BILLABLE_TYPES: ReadonlySet<EntryType> = new Set(["worked", "remote", "onsite"]);

// Types consuming daily capacity (work + on-call; leave/unavailable do not).
export const COUNTED_TYPES: ReadonlySet<EntryType> = new Set([
  "worked",
  "remote",
  "onsite",
  "on_call",
]);

export interface EntryLike {
  date: string;
  quantity: number;
  type: EntryType;
  comment?: string | null;
}

export interface MissionLike {
  tjmCents?: number;
  unit: "day" | "hour";
  hoursPerDay: number;
}

const EPSILON = 1e-9;

// Day-equivalent of an entry (hour mode converts via hoursPerDay).
export function dayEquivalent(entry: EntryLike, mission: MissionLike): number {
  return mission.unit === "hour" ? entry.quantity / mission.hoursPerDay : entry.quantity;
}

export interface TimesheetTotals {
  billableDays: number;
  halfDays: number;
  onCallDays: number;
  leaveDays: number;
  unavailableDays: number;
  amountCents: number;
}

export function computeTotals(entries: EntryLike[], mission: MissionLike): TimesheetTotals {
  let billableDays = 0;
  let halfDays = 0;
  let onCallDays = 0;
  let leaveDays = 0;
  let unavailableDays = 0;
  for (const entry of entries) {
    const equivalent = dayEquivalent(entry, mission);
    if (BILLABLE_TYPES.has(entry.type)) {
      billableDays += equivalent;
      if (Math.abs(equivalent - 0.5) < EPSILON) {
        halfDays += 1;
      }
    } else if (entry.type === "on_call") {
      onCallDays += equivalent;
    } else if (entry.type === "leave") {
      leaveDays += equivalent;
    } else if (entry.type === "unavailable") {
      unavailableDays += equivalent;
    }
  }
  return {
    billableDays: round2(billableDays),
    halfDays,
    onCallDays: round2(onCallDays),
    leaveDays: round2(leaveDays),
    unavailableDays: round2(unavailableDays),
    amountCents: Math.round((mission.tjmCents ?? 0) * billableDays),
  };
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// Sum of counted day-equivalents for one date (multi-mission daily cap).
export function dayTotal(entries: EntryLike[], mission: MissionLike): number {
  return entries.reduce(
    (sum, entry) => (COUNTED_TYPES.has(entry.type) ? sum + dayEquivalent(entry, mission) : sum),
    0,
  );
}

// The daily total across all missions must not exceed 1 day-equivalent.
export function exceedsDayLimit(total: number): boolean {
  return total > 1 + EPSILON;
}

// Click cycle: 1 → 0.5 → 0 (spec §5.1).
export function nextQuantity(current: number): number {
  if (current >= 1) {
    return 0.5;
  }
  if (current >= 0.5) {
    return 0;
  }
  return 1;
}

export type EntryValidationReason = "OUT_OF_MONTH" | "INVALID_QUANTITY";

// Pure entry validation (unit-testable, no DB). Returns a reason or null.
export function validateEntry(
  entry: EntryLike,
  unit: "day" | "hour",
  periodDates: ReadonlySet<string>,
): EntryValidationReason | null {
  if (!periodDates.has(entry.date)) {
    return "OUT_OF_MONTH";
  }
  if (
    unit === "day" &&
    (entry.quantity > 1 || Math.abs(entry.quantity * 4 - Math.round(entry.quantity * 4)) > 1e-9)
  ) {
    return "INVALID_QUANTITY";
  }
  return null;
}
