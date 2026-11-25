import { afterAll, beforeAll, describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { inArray } from "drizzle-orm";
import { auth } from "@/server/auth";
import { db, pool } from "@/server/db";
import * as schema from "@/server/db/schema";
import { createClient } from "@/server/services/clients";
import { createMission } from "@/server/services/missions";
import { getOrCreateTimesheet, setEntries } from "@/server/services/timesheets";
import { getExportData } from "@/server/services/exports";
import { buildStandardXlsx } from "@/server/excel/standard";
import { fillTemplate } from "@/server/excel/template";
import { loadWorkbook } from "@/server/excel/load";
import { buildCraPdf } from "@/server/pdf";
import { DEFAULT_MAPPING } from "@/lib/validation/export-template";

const PASSWORD = "Correct-Horse-Battery-9!";
const EMAIL_A = "exports-a@test.local";
const EMAIL_B = "exports-b@test.local";

let userAId = "";
let userBId = "";
let sheetId = "";

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
    legalName: "Client Export",
    siret: null,
    address: null,
    notes: null,
  });
  const mission = await createMission(userAId, {
    clientId: clientA!.id,
    title: "Mission Export",
    startDate: "2026-01-01",
    endDate: null,
    tjmCents: 50000,
    unit: "day",
    hoursPerDay: 7,
    holidayTerritory: "metropole",
    status: "active",
  });
  const { timesheet } = await getOrCreateTimesheet(userAId, mission!.id, 2026, 1);
  sheetId = timesheet.id;
  await setEntries(userAId, sheetId, [
    { date: "2026-01-05", quantity: 1, type: "worked", comment: "OK" },
    { date: "2026-01-06", quantity: 0.5, type: "remote", comment: null },
  ]);
});

afterAll(async () => {
  await db.delete(schema.timesheet).where(inArray(schema.timesheet.userId, [userAId, userBId]));
  await db.delete(schema.mission).where(inArray(schema.mission.userId, [userAId, userBId]));
  await db.delete(schema.client).where(inArray(schema.client.userId, [userAId, userBId]));
  await db.delete(schema.auditLog).where(inArray(schema.auditLog.userId, [userAId, userBId]));
  await db.delete(schema.user).where(inArray(schema.user.email, [EMAIL_A, EMAIL_B]));
  await pool.end();
});

describe("exports (integration)", () => {
  it("assembles export data with totals", async () => {
    const data = await getExportData(userAId, sheetId);
    expect(data.entries).toHaveLength(2);
    expect(data.totals.billableDays).toBe(1.5);
    expect(data.periodLabel).toContain("janvier");
    expect(data.consultant).toBe("Alice"); // repli sur le nom du compte (pas de profil)
  });

  it("blocks export data access for another user (IDOR)", async () => {
    await expect(getExportData(userBId, sheetId)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("generates a standard xlsx", async () => {
    const data = await getExportData(userAId, sheetId);
    const buffer = await buildStandardXlsx(data);
    expect(buffer.subarray(0, 2).toString()).toBe("PK");
    const workbook = await loadWorkbook(buffer);
    expect(workbook.worksheets[0]?.name).toBe("CRA");
  });

  it("fills a client template preserving other cells", async () => {
    const template = new ExcelJS.Workbook();
    const sheet = template.addWorksheet("Gabarit");
    sheet.getCell("A1").value = "FORMAT CLIENT À CONSERVER";
    const templateBuffer = Buffer.from(await template.xlsx.writeBuffer());
    const data = await getExportData(userAId, sheetId);
    const filled = await fillTemplate(templateBuffer, DEFAULT_MAPPING, data);
    const workbook = await loadWorkbook(filled);
    const result = workbook.worksheets[0]!;
    expect(result.getCell("A1").value).toBe("FORMAT CLIENT À CONSERVER");
    expect(result.getCell("B3").value).toBe("Client Export");
    expect(result.getCell("A8").value).toBe("2026-01-05");
    expect(result.getCell("B8").value).toBe(1);
    expect(result.getCell("B40").value).toBe(1.5);
  });

  it("generates a PDF", async () => {
    const data = await getExportData(userAId, sheetId);
    const buffer = await buildCraPdf(data);
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(buffer.length).toBeGreaterThan(1000);
  });
});
