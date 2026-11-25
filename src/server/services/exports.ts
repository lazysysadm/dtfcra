import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { timesheetEntry, user } from "@/server/db/schema";
import { computeTotals, type EntryLike, type TimesheetTotals } from "@/lib/timesheet";
import { getClient } from "./clients";
import { getMission } from "./missions";
import { getProfile } from "./profile";
import { getTimesheet } from "./timesheets";

export interface ExportData {
  timesheetId: string;
  year: number;
  month: number;
  periodLabel: string;
  consultant: string;
  mission: {
    id: string;
    title: string;
    unit: "day" | "hour";
    hoursPerDay: number;
    exportTemplateId: string | null;
  };
  client: { legalName: string; siret: string | null; address: string | null };
  profile: {
    legalName: string;
    siret: string | null;
    address: string | null;
    vatNumber: string | null;
    brandColor: string;
    logoPath: string | null;
  } | null;
  entries: EntryLike[];
  totals: TimesheetTotals;
}

export async function getExportData(userId: string, timesheetId: string): Promise<ExportData> {
  const sheet = await getTimesheet(userId, timesheetId);
  const missionRow = await getMission(userId, sheet.missionId);
  const clientRow = await getClient(userId, missionRow.clientId);
  const profileRow = await getProfile(userId);
  const userRows = await db
    .select({ name: user.name })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  const consultant = profileRow?.consultantName ?? userRows[0]?.name ?? "";
  const rows = await db
    .select()
    .from(timesheetEntry)
    .where(eq(timesheetEntry.timesheetId, sheet.id))
    .orderBy(timesheetEntry.date);
  const entries: EntryLike[] = rows.map((row) => ({
    date: row.date,
    quantity: Number(row.quantity),
    type: row.type,
    comment: row.comment,
  }));
  const mission = {
    id: missionRow.id,
    title: missionRow.title,
    unit: missionRow.unit,
    hoursPerDay: Number(missionRow.hoursPerDay),
    exportTemplateId: missionRow.exportTemplateId,
  };
  const totals = computeTotals(entries, mission);
  const periodLabel = new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(sheet.year, sheet.month - 1, 1)));
  return {
    timesheetId: sheet.id,
    year: sheet.year,
    month: sheet.month,
    periodLabel,
    consultant,
    mission,
    client: {
      legalName: clientRow.legalName,
      siret: clientRow.siret,
      address: clientRow.address,
    },
    profile: profileRow
      ? {
          legalName: profileRow.legalName,
          siret: profileRow.siret,
          address: profileRow.address,
          vatNumber: profileRow.vatNumber,
          brandColor: profileRow.brandColor,
          logoPath: profileRow.logoPath,
        }
      : null,
    entries,
    totals,
  };
}

export function exportFilename(data: ExportData, ext: string): string {
  const slug = data.mission.title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `cra-${slug || "mission"}-${data.year}-${String(data.month).padStart(2, "0")}.${ext}`;
}
