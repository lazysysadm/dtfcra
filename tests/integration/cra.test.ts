import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";
import { auth } from "@/server/auth";
import { db, pool } from "@/server/db";
import * as schema from "@/server/db/schema";
import { createClient } from "@/server/services/clients";
import { createMission, deleteMission } from "@/server/services/missions";
import {
  clearMonth,
  copyPreviousMonth,
  fillWorkingDays,
  findTimesheet,
  getOrCreateTimesheet,
  getTimesheet,
  setEntries,
} from "@/server/services/timesheets";
import type { MissionInput } from "@/lib/validation/referential";

const PASSWORD = "Correct-Horse-Battery-9!";
const EMAIL_A = "cra-a@test.local";
const EMAIL_B = "cra-b@test.local";

let userAId = "";
let userBId = "";
let mission1Id = "";
let mission2Id = "";
let sheet1Id = "";

function missionInput(clientId: string, overrides: Partial<MissionInput> = {}): MissionInput {
  return {
    clientId,
    title: "Mission CRA",
    startDate: "2026-01-01",
    endDate: null,
    tjmCents: 50000,
    unit: "day",
    hoursPerDay: 7,
    holidayTerritory: "metropole",
    status: "active",
    ...overrides,
  };
}

beforeAll(async () => {
  await db.delete(schema.user).where(inArray(schema.user.email, [EMAIL_A, EMAIL_B]));
  await db.delete(schema.rateLimit);
  await db.delete(schema.publicRateLimit);
  const a = await auth.api.signUpEmail({
    body: { name: "Alice", email: EMAIL_A, password: PASSWORD },
  });
  const b = await auth.api.signUpEmail({
    body: { name: "Bob", email: EMAIL_B, password: PASSWORD },
  });
  userAId = a.user.id;
  userBId = b.user.id;
  const clientA = await createClient(userAId, {
    legalName: "Client CRA",
    siret: null,
    address: null,
    notes: null,
  });
  const m1 = await createMission(userAId, missionInput(clientA!.id));
  const m2 = await createMission(userAId, missionInput(clientA!.id, { title: "Mission 2" }));
  mission1Id = m1!.id;
  mission2Id = m2!.id;
  const { timesheet } = await getOrCreateTimesheet(userAId, mission1Id, 2026, 1);
  sheet1Id = timesheet.id;
});

afterAll(async () => {
  await db.delete(schema.timesheet).where(inArray(schema.timesheet.userId, [userAId, userBId]));
  await db.delete(schema.mission).where(inArray(schema.mission.userId, [userAId, userBId]));
  await db.delete(schema.client).where(inArray(schema.client.userId, [userAId, userBId]));
  await db.delete(schema.auditLog).where(inArray(schema.auditLog.userId, [userAId, userBId]));
  await db.delete(schema.user).where(inArray(schema.user.email, [EMAIL_A, EMAIL_B]));
  await pool.end();
});

describe("CRA enregistrement (integration)", () => {
  it("creates a CRA and saves entries", async () => {
    const { timesheet, entries } = await getOrCreateTimesheet(userAId, mission1Id, 2026, 1);
    expect(entries).toHaveLength(0);
    await setEntries(userAId, sheet1Id, [
      { date: "2026-01-05", quantity: 0.5, type: "worked", comment: null },
    ]);
    const after = await getOrCreateTimesheet(userAId, mission1Id, 2026, 1);
    expect(after.entries).toHaveLength(1);
    expect(after.entries[0]?.quantity).toBe(0.5);
    expect(after.timesheet.id).toBe(timesheet.id);
  });

  it("blocks a daily total above 1 day across missions", async () => {
    const { timesheet: sheet2 } = await getOrCreateTimesheet(userAId, mission2Id, 2026, 1);
    await setEntries(userAId, sheet2.id, [
      { date: "2026-01-05", quantity: 0.5, type: "worked", comment: null },
    ]);
    await expect(
      setEntries(userAId, sheet2.id, [
        { date: "2026-01-05", quantity: 0.75, type: "worked", comment: null },
      ]),
    ).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("does not count leave against the daily cap", async () => {
    const { timesheet: sheet2 } = await getOrCreateTimesheet(userAId, mission2Id, 2026, 1);
    await setEntries(userAId, sheet2.id, [
      { date: "2026-01-05", quantity: 1, type: "leave", comment: null },
    ]);
    const after = await getOrCreateTimesheet(userAId, mission2Id, 2026, 1);
    expect(after.entries[0]?.type).toBe("leave");
  });

  it("serializes concurrent writes so the daily cap cannot race", async () => {
    const { timesheet: s1 } = await getOrCreateTimesheet(userAId, mission1Id, 2026, 1);
    const { timesheet: s2 } = await getOrCreateTimesheet(userAId, mission2Id, 2026, 1);
    const results = await Promise.allSettled([
      setEntries(userAId, s1.id, [
        { date: "2026-01-20", quantity: 1, type: "worked", comment: null },
      ]),
      setEntries(userAId, s2.id, [
        { date: "2026-01-20", quantity: 1, type: "worked", comment: null },
      ]),
    ]);
    const rejected = results.filter((r) => r.status === "rejected");
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toMatchObject({ reason: "DAILY_CAP" });
  });

  it("rejects out-of-month dates and invalid day quantities", async () => {
    await expect(
      setEntries(userAId, sheet1Id, [
        { date: "2026-02-01", quantity: 1, type: "worked", comment: null },
      ]),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(
      setEntries(userAId, sheet1Id, [
        { date: "2026-01-06", quantity: 0.3, type: "worked", comment: null },
      ]),
    ).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("stays editable after saving (no locking workflow)", async () => {
    await setEntries(userAId, sheet1Id, [
      { date: "2026-01-05", quantity: 1, type: "remote", comment: "modifié" },
    ]);
    const after = await getTimesheet(userAId, sheet1Id);
    const { entries } = await getOrCreateTimesheet(userAId, mission1Id, 2026, 1);
    expect(entries[0]?.type).toBe("remote");
    expect(after.id).toBe(sheet1Id);
  });

  it("fills working days, copies previous month, clears", async () => {
    const { timesheet: feb } = await getOrCreateTimesheet(userAId, mission1Id, 2026, 2);
    await fillWorkingDays(userAId, feb.id);
    const febAfter = await getOrCreateTimesheet(userAId, mission1Id, 2026, 2);
    expect(febAfter.entries).toHaveLength(20); // février 2026 : 20 jours ouvrés
    const { timesheet: mar } = await getOrCreateTimesheet(userAId, mission1Id, 2026, 3);
    await copyPreviousMonth(userAId, mar.id);
    const marAfter = await getOrCreateTimesheet(userAId, mission1Id, 2026, 3);
    expect(marAfter.entries).toHaveLength(20);
    await clearMonth(userAId, mar.id);
    const cleared = await getOrCreateTimesheet(userAId, mission1Id, 2026, 3);
    expect(cleared.entries).toHaveLength(0);
  });

  it("blocks mission deletion when CRAs exist", async () => {
    await expect(deleteMission(userAId, mission1Id)).rejects.toMatchObject({ code: "CONFLICT" });
  });
});

describe("CRA tenant isolation (IDOR)", () => {
  it("user B cannot access user A's timesheets or missions", async () => {
    await expect(getTimesheet(userBId, sheet1Id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      setEntries(userBId, sheet1Id, [
        { date: "2026-01-05", quantity: 1, type: "worked", comment: null },
      ]),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(getOrCreateTimesheet(userBId, mission1Id, 2026, 1)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("findTimesheet is read-only: no row is created for a missing month", async () => {
    const before = await db.select().from(schema.timesheet);
    const found = await findTimesheet(userAId, mission1Id, 2026, 11);
    expect(found.timesheet).toBeNull();
    const after = await db.select().from(schema.timesheet);
    expect(after).toHaveLength(before.length);
  });
});
