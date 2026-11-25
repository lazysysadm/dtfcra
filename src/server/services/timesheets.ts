import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { mission, timesheet, timesheetEntry } from "@/server/db/schema";
import { entriesSchema } from "@/lib/validation/timesheet";
import { monthDays, workingDaysInMonth } from "@/lib/holidays";
import type { Territory } from "@/lib/holidays/territories";
import {
  COUNTED_TYPES,
  dayEquivalent,
  exceedsDayLimit,
  validateEntry,
  type EntryLike,
} from "@/lib/timesheet";
import { logAudit } from "./audit";
import { DomainError, firstOrThrow } from "./errors";
import { getMission } from "./missions";

export interface TimesheetEntryView {
  date: string;
  quantity: number;
  type: EntryLike["type"];
  comment: string | null;
}

function mapEntry(row: typeof timesheetEntry.$inferSelect): TimesheetEntryView {
  return {
    date: row.date,
    quantity: Number(row.quantity),
    type: row.type,
    comment: row.comment,
  };
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function getTimesheet(userId: string, timesheetId: string) {
  const rows = await db
    .select()
    .from(timesheet)
    .where(and(eq(timesheet.id, timesheetId), eq(timesheet.userId, userId)))
    .limit(1);
  return firstOrThrow(rows, "Timesheet not found");
}

export async function listTimesheets(
  userId: string,
  missionId?: string,
  period?: { year: number; month: number },
) {
  const conditions = [eq(timesheet.userId, userId)];
  if (missionId) {
    conditions.push(eq(timesheet.missionId, missionId));
  }
  if (period) {
    conditions.push(eq(timesheet.year, period.year), eq(timesheet.month, period.month));
  }
  return db
    .select()
    .from(timesheet)
    .where(and(...conditions))
    .orderBy(desc(timesheet.year), desc(timesheet.month));
}

// Read-only lookup (safe for GET rendering: no write, no audit).
export async function findTimesheet(
  userId: string,
  missionId: string,
  year: number,
  month: number,
) {
  const missionRow = await getMission(userId, missionId);
  const rows = await db
    .select()
    .from(timesheet)
    .where(
      and(
        eq(timesheet.userId, userId),
        eq(timesheet.missionId, missionId),
        eq(timesheet.year, year),
        eq(timesheet.month, month),
      ),
    )
    .limit(1);
  const sheet = rows[0];
  if (!sheet) {
    return { timesheet: null, mission: missionRow, entries: [] as TimesheetEntryView[] };
  }
  const entries = await db
    .select()
    .from(timesheetEntry)
    .where(eq(timesheetEntry.timesheetId, sheet.id))
    .orderBy(timesheetEntry.date);
  return { timesheet: sheet, mission: missionRow, entries: entries.map(mapEntry) };
}

// Explicit creation (user action only). on conflict do nothing + re-select
// avoids the SELECT-then-INSERT race.
export async function getOrCreateTimesheet(
  userId: string,
  missionId: string,
  year: number,
  month: number,
  ip?: string | null,
) {
  await getMission(userId, missionId);
  const inserted = await db
    .insert(timesheet)
    .values({ userId, missionId, year, month })
    .onConflictDoNothing({ target: [timesheet.missionId, timesheet.year, timesheet.month] })
    .returning({ id: timesheet.id });
  if (inserted[0]) {
    await logAudit({
      userId,
      actor: "user",
      action: "timesheet.create",
      entity: "timesheet",
      entityId: inserted[0].id,
      ip,
    });
  }
  const found = await findTimesheet(userId, missionId, year, month);
  if (!found.timesheet) {
    throw new DomainError("INTERNAL", "Timesheet creation failed");
  }
  return { ...found, timesheet: found.timesheet };
}

// Blocking rule: total across all missions ≤ 1 day-equivalent per date.
// Runs inside the write transaction (serialized per user) and is bounded to
// the timesheet month.
async function assertDailyCap(
  tx: Tx,
  userId: string,
  sheet: typeof timesheet.$inferSelect,
  missionRow: typeof mission.$inferSelect,
  entries: EntryLike[],
) {
  const dates = entries.filter((entry) => entry.quantity > 0).map((entry) => entry.date);
  if (dates.length === 0) {
    return;
  }
  const others = (
    await tx
      .select()
      .from(timesheet)
      .where(
        and(
          eq(timesheet.userId, userId),
          eq(timesheet.year, sheet.year),
          eq(timesheet.month, sheet.month),
        ),
      )
  ).filter((row) => row.missionId !== sheet.missionId);
  if (others.length === 0) {
    return;
  }
  const otherMissions = await tx
    .select()
    .from(mission)
    .where(
      and(
        eq(mission.userId, userId),
        inArray(
          mission.id,
          others.map((row) => row.missionId),
        ),
      ),
    );
  const missionById = new Map(otherMissions.map((row) => [row.id, row]));
  const otherEntries = await tx
    .select()
    .from(timesheetEntry)
    .where(
      and(
        inArray(
          timesheetEntry.timesheetId,
          others.map((row) => row.id),
        ),
        inArray(timesheetEntry.date, dates),
      ),
    );
  const params = { unit: missionRow.unit, hoursPerDay: Number(missionRow.hoursPerDay) };
  for (const entry of entries) {
    if (entry.quantity <= 0 || !COUNTED_TYPES.has(entry.type)) {
      continue;
    }
    let total = dayEquivalent(entry, params);
    for (const other of otherEntries) {
      if (other.date !== entry.date || !COUNTED_TYPES.has(other.type)) {
        continue;
      }
      const otherMission = missionById.get(
        others.find((row) => row.id === other.timesheetId)?.missionId ?? "",
      );
      if (!otherMission) {
        continue;
      }
      total += dayEquivalent(mapEntry(other), {
        unit: otherMission.unit,
        hoursPerDay: Number(otherMission.hoursPerDay),
      });
    }
    if (exceedsDayLimit(total)) {
      throw new DomainError("VALIDATION", "Daily total exceeds 1 day", "DAILY_CAP");
    }
  }
}

async function applyEntries(
  userId: string,
  sheet: typeof timesheet.$inferSelect,
  missionRow: typeof mission.$inferSelect,
  entries: EntryLike[],
  expectedUpdatedAt?: number,
  ip?: string | null,
) {
  const periodDates = new Set(monthDays(sheet.year, sheet.month));
  for (const entry of entries) {
    const reason = validateEntry(entry, missionRow.unit, periodDates);
    if (reason) {
      throw new DomainError(
        "VALIDATION",
        reason === "OUT_OF_MONTH"
          ? "Entry date outside the timesheet month"
          : "Day quantities must be 0, 0.25, 0.5 or 1",
        reason,
      );
    }
  }

  await db.transaction(async (tx) => {
    // Serialize all writes of a user so the multi-mission daily cap cannot race.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
    const current = await tx.select().from(timesheet).where(eq(timesheet.id, sheet.id)).limit(1);
    const fresh = current[0];
    if (!fresh) {
      throw new DomainError("NOT_FOUND", "Timesheet not found");
    }
    if (expectedUpdatedAt !== undefined && fresh.updatedAt.getTime() !== expectedUpdatedAt) {
      throw new DomainError("CONFLICT", "Timesheet changed elsewhere", "STALE_VERSION");
    }
    await assertDailyCap(tx, userId, fresh, missionRow, entries);

    const positive = entries.filter((entry) => entry.quantity > 0);
    const keepDates = new Set(positive.map((entry) => entry.date));
    const existingRows = await tx
      .select()
      .from(timesheetEntry)
      .where(eq(timesheetEntry.timesheetId, sheet.id));
    const existingByDate = new Map(existingRows.map((row) => [row.date, mapEntry(row)]));
    const removed = [...existingByDate.keys()].filter((date) => !keepDates.has(date));
    let added = 0;
    let changed = 0;
    for (const entry of positive) {
      const prev = existingByDate.get(entry.date);
      if (!prev) {
        added += 1;
      } else if (
        prev.quantity !== entry.quantity ||
        prev.type !== entry.type ||
        (prev.comment ?? null) !== (entry.comment ?? null)
      ) {
        changed += 1;
      }
    }
    // No actual change: skip the write, the updatedAt bump and the audit noise.
    if (added === 0 && changed === 0 && removed.length === 0) {
      return;
    }
    if (removed.length > 0) {
      await tx
        .delete(timesheetEntry)
        .where(
          and(eq(timesheetEntry.timesheetId, sheet.id), inArray(timesheetEntry.date, removed)),
        );
    }
    if (positive.length > 0) {
      await tx
        .insert(timesheetEntry)
        .values(
          positive.map((entry) => ({
            userId,
            timesheetId: sheet.id,
            date: entry.date,
            quantity: String(entry.quantity),
            type: entry.type,
            comment: entry.comment ?? null,
          })),
        )
        .onConflictDoUpdate({
          target: [timesheetEntry.timesheetId, timesheetEntry.date],
          set: {
            quantity: sql`excluded.quantity`,
            type: sql`excluded.type`,
            comment: sql`excluded.comment`,
          },
        });
    }
    await tx.update(timesheet).set({ updatedAt: new Date() }).where(eq(timesheet.id, sheet.id));
    await logAudit(
      {
        userId,
        actor: "user",
        action: "timesheet.entries",
        entity: "timesheet",
        entityId: sheet.id,
        ip,
        metadata: { added, changed, removed: removed.length },
      },
      tx,
    );
  });
  const refreshed = await getTimesheet(userId, sheet.id);
  return refreshed.updatedAt.getTime();
}

export async function setEntries(
  userId: string,
  timesheetId: string,
  rawEntries: unknown,
  expectedUpdatedAt?: number,
  ip?: string | null,
) {
  const sheet = await getTimesheet(userId, timesheetId);
  const missionRow = await getMission(userId, sheet.missionId);
  const entries = entriesSchema.parse(rawEntries);
  return applyEntries(userId, sheet, missionRow, entries, expectedUpdatedAt, ip);
}

export async function fillWorkingDays(userId: string, timesheetId: string, ip?: string | null) {
  const sheet = await getTimesheet(userId, timesheetId);
  const missionRow = await getMission(userId, sheet.missionId);
  const existing = await db
    .select()
    .from(timesheetEntry)
    .where(eq(timesheetEntry.timesheetId, sheet.id));
  const working = new Set(
    workingDaysInMonth(sheet.year, sheet.month, missionRow.holidayTerritory as Territory),
  );
  const kept = existing.filter((entry) => !working.has(entry.date)).map(mapEntry);
  const filled: EntryLike[] = [
    ...kept,
    ...[...working].map((date) => ({ date, quantity: 1, type: "worked" as const, comment: null })),
  ];
  await applyEntries(userId, sheet, missionRow, filled, undefined, ip);
}

export async function copyPreviousMonth(userId: string, timesheetId: string, ip?: string | null) {
  const sheet = await getTimesheet(userId, timesheetId);
  const missionRow = await getMission(userId, sheet.missionId);
  const prevYear = sheet.month === 1 ? sheet.year - 1 : sheet.year;
  const prevMonth = sheet.month === 1 ? 12 : sheet.month - 1;
  const previous = (
    await listTimesheets(userId, sheet.missionId, { year: prevYear, month: prevMonth })
  )[0];
  if (!previous) {
    throw new DomainError("NOT_FOUND", "No previous month to copy");
  }
  const prevEntries = await db
    .select()
    .from(timesheetEntry)
    .where(eq(timesheetEntry.timesheetId, previous.id));
  const currentDates = new Set(monthDays(sheet.year, sheet.month));
  const copied: EntryLike[] = [];
  for (const entry of prevEntries) {
    const day = entry.date.slice(8, 10);
    const date = `${sheet.year}-${String(sheet.month).padStart(2, "0")}-${day}`;
    if (currentDates.has(date)) {
      copied.push({ ...mapEntry(entry), date });
    }
  }
  await applyEntries(userId, sheet, missionRow, copied, undefined, ip);
}

export async function clearMonth(userId: string, timesheetId: string, ip?: string | null) {
  const sheet = await getTimesheet(userId, timesheetId);
  const missionRow = await getMission(userId, sheet.missionId);
  await applyEntries(userId, sheet, missionRow, [], undefined, ip);
}
