import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { mission, timesheetEntry } from "@/server/db/schema";
import { workingDaysInMonth } from "@/lib/holidays";
import type { Territory } from "@/lib/holidays/territories";
import {
  BILLABLE_TYPES,
  dayEquivalent,
  round2,
  type EntryLike,
  type MissionLike,
} from "@/lib/timesheet";
import { getProfile } from "./profile";
import { listTimesheets } from "./timesheets";

type Sheet = Awaited<ReturnType<typeof listTimesheets>>[number];
type MissionRow = typeof mission.$inferSelect;

function params(row: MissionRow): MissionLike {
  return {
    tjmCents: row.tjmCents,
    unit: row.unit,
    hoursPerDay: Number(row.hoursPerDay),
  };
}

// numeric columns come back as strings — normalize once.
function toEntry(row: typeof timesheetEntry.$inferSelect): EntryLike {
  return {
    date: row.date,
    quantity: Number(row.quantity),
    type: row.type,
    comment: row.comment,
  };
}

async function entriesFor(sheets: Sheet[]) {
  if (sheets.length === 0) {
    return [];
  }
  return db
    .select()
    .from(timesheetEntry)
    .where(
      inArray(
        timesheetEntry.timesheetId,
        sheets.map((sheet) => sheet.id),
      ),
    );
}

async function userMissions(userId: string) {
  const rows = await db.select().from(mission).where(eq(mission.userId, userId));
  return new Map(rows.map((row) => [row.id, row]));
}

export interface DailyTotals {
  totals: Record<string, number>;
  perMission: Array<{ missionId: string; title: string; days: number }>;
  overLimitDates: string[];
}

export async function dailyTotals(
  userId: string,
  year: number,
  month: number,
): Promise<DailyTotals> {
  const sheets = await listTimesheets(userId, undefined, { year, month });
  const entries = await entriesFor(sheets);
  const missionById = await userMissions(userId);
  const sheetById = new Map(sheets.map((sheet) => [sheet.id, sheet]));
  const totals: Record<string, number> = {};
  const perMission = new Map<string, number>();
  for (const row of entries) {
    const entry = toEntry(row);
    const sheet = sheetById.get(row.timesheetId);
    const missionRow = sheet ? missionById.get(sheet.missionId) : undefined;
    if (!sheet || !missionRow) {
      continue;
    }
    const equivalent = dayEquivalent(entry, params(missionRow));
    totals[entry.date] = round2((totals[entry.date] ?? 0) + equivalent);
    if (BILLABLE_TYPES.has(entry.type)) {
      perMission.set(missionRow.id, (perMission.get(missionRow.id) ?? 0) + equivalent);
    }
  }
  return {
    totals,
    perMission: [...perMission.entries()].map(([missionId, days]) => ({
      missionId,
      title: missionById.get(missionId)?.title ?? "",
      days: round2(days),
    })),
    overLimitDates: Object.entries(totals)
      .filter(([, total]) => total > 1.000000001)
      .map(([date]) => date),
  };
}

export interface DashboardStats {
  monthBillableDays: number;
  monthRevenueCents: number;
  yearRevenueCents: number;
  occupancyRate: number;
  last12Months: Array<{ label: string; days: number }>;
}

export async function dashboardStats(
  userId: string,
  year: number,
  month: number,
): Promise<DashboardStats> {
  // Bounded SQL aggregation over the 12-month window (no full history in memory).
  const endIdx = year * 12 + (month - 1);
  const startIdx = endIdx - 11;
  const rows = await db.execute<{ y: number; m: number; days: string; revenue: string }>(sql`
    select t.year as y, t.month as m,
      sum(case when m.unit = 'hour' then e.quantity::numeric / m.hours_per_day else e.quantity::numeric end) as days,
      sum(m.tjm_cents * (case when m.unit = 'hour' then e.quantity::numeric / m.hours_per_day else e.quantity::numeric end)) as revenue
    from timesheet_entry e
    join timesheet t on e.timesheet_id = t.id
    join mission m on t.mission_id = m.id
    where t.user_id = ${userId}
      and e.type in ('worked', 'remote', 'onsite')
      and (t.year * 12 + t.month - 1) between ${startIdx} and ${endIdx}
    group by t.year, t.month
  `);

  const months: Array<{ year: number; month: number; label: string; days: number }> = [];
  for (let offset = 11; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(year, month - 1 - offset, 1));
    const y = date.getUTCFullYear();
    const m = date.getUTCMonth() + 1;
    months.push({
      year: y,
      month: m,
      label: `${String(m).padStart(2, "0")}/${String(y).slice(2)}`,
      days: 0,
    });
  }

  let monthDays = 0;
  let monthRevenue = 0;
  let yearRevenue = 0;
  for (const row of rows.rows) {
    const days = Number(row.days);
    const revenue = Number(row.revenue);
    if (row.y === year && row.m === month) {
      monthDays += days;
      monthRevenue += revenue;
    }
    if (row.y === year) {
      yearRevenue += revenue;
    }
    const bucket = months.find((item) => item.year === row.y && item.month === row.m);
    if (bucket) {
      bucket.days += days;
    }
  }

  const profile = await getProfile(userId);
  const territory = (profile?.holidayTerritory ?? "metropole") as Territory;
  const workingDays = workingDaysInMonth(year, month, territory).length;

  return {
    monthBillableDays: round2(monthDays),
    monthRevenueCents: Math.round(monthRevenue),
    yearRevenueCents: Math.round(yearRevenue),
    occupancyRate: workingDays > 0 ? round2(monthDays / workingDays) : 0,
    last12Months: months.map(({ label, days }) => ({ label, days: round2(days) })),
  };
}
