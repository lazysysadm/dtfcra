import { and, desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { mission, timesheet, timesheetEntry } from "@/server/db/schema";
import type { MissionInput } from "@/lib/validation/referential";
import { logAudit } from "./audit";
import { getClient } from "./clients";
import { DomainError } from "./errors";

export interface MissionFilters {
  clientId?: string;
  status?: "active" | "archived";
}

export async function listMissions(userId: string, filters: MissionFilters = {}) {
  const conditions = [eq(mission.userId, userId)];
  if (filters.clientId) {
    conditions.push(eq(mission.clientId, filters.clientId));
  }
  if (filters.status) {
    conditions.push(eq(mission.status, filters.status));
  }
  return db
    .select()
    .from(mission)
    .where(and(...conditions))
    .orderBy(desc(mission.startDate));
}

export async function getMission(userId: string, missionId: string) {
  const rows = await db
    .select()
    .from(mission)
    .where(and(eq(mission.id, missionId), eq(mission.userId, userId)))
    .limit(1);
  const row = rows[0];
  if (!row) {
    throw new DomainError("NOT_FOUND", "Mission not found");
  }
  return row;
}

export async function createMission(userId: string, input: MissionInput) {
  await getClient(userId, input.clientId);
  const rows = await db
    .insert(mission)
    .values({ userId, ...input, hoursPerDay: String(input.hoursPerDay) })
    .returning();
  const created = rows[0];
  await logAudit({
    userId,
    actor: "user",
    action: "mission.create",
    entity: "mission",
    entityId: created?.id,
  });
  return created;
}

export async function updateMission(userId: string, missionId: string, input: MissionInput) {
  const existing = await getMission(userId, missionId);
  await getClient(userId, input.clientId);
  // Changing unit / hours-per-day would retroactively alter recorded totals:
  // refuse once any entry exists.
  const unitChanged =
    input.unit !== existing.unit || input.hoursPerDay !== Number(existing.hoursPerDay);
  if (unitChanged) {
    const entries = await db
      .select({ id: timesheetEntry.id })
      .from(timesheetEntry)
      .innerJoin(timesheet, eq(timesheetEntry.timesheetId, timesheet.id))
      .where(eq(timesheet.missionId, missionId))
      .limit(1);
    if (entries.length > 0) {
      throw new DomainError(
        "CONFLICT",
        "Unit change with existing entries",
        "UNIT_CHANGE_WITH_ENTRIES",
      );
    }
  }
  const rows = await db
    .update(mission)
    .set({
      clientId: input.clientId,
      title: input.title,
      startDate: input.startDate,
      endDate: input.endDate,
      tjmCents: input.tjmCents,
      unit: input.unit,
      hoursPerDay: String(input.hoursPerDay),
      holidayTerritory: input.holidayTerritory,
      status: input.status,
      updatedAt: new Date(),
    })
    .where(and(eq(mission.id, missionId), eq(mission.userId, userId)))
    .returning();
  await logAudit({
    userId,
    actor: "user",
    action: "mission.update",
    entity: "mission",
    entityId: missionId,
  });
  return rows[0];
}

export async function setMissionStatus(
  userId: string,
  missionId: string,
  status: "active" | "archived",
) {
  await getMission(userId, missionId);
  const rows = await db
    .update(mission)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(mission.id, missionId), eq(mission.userId, userId)))
    .returning();
  await logAudit({
    userId,
    actor: "user",
    action: status === "archived" ? "mission.archive" : "mission.unarchive",
    entity: "mission",
    entityId: missionId,
  });
  return rows[0];
}

export async function deleteMission(userId: string, missionId: string) {
  await getMission(userId, missionId);
  const sheets = await db
    .select({ id: timesheet.id })
    .from(timesheet)
    .where(and(eq(timesheet.missionId, missionId), eq(timesheet.userId, userId)))
    .limit(1);
  if (sheets.length > 0) {
    throw new DomainError("CONFLICT", "Mission has timesheets");
  }
  await db.delete(mission).where(and(eq(mission.id, missionId), eq(mission.userId, userId)));
  await logAudit({
    userId,
    actor: "user",
    action: "mission.delete",
    entity: "mission",
    entityId: missionId,
  });
}
