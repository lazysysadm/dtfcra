import { describe, expect, it } from "vitest";
import { DEFAULT_MAPPING, templateMappingSchema } from "@/lib/validation/export-template";
import { isXlsx, sniffImage } from "@/server/services/uploads";
import { buildCsv } from "@/server/excel/csv";
import type { ExportData } from "@/server/services/exports";

describe("templateMappingSchema", () => {
  it("accepts the default mapping", () => {
    expect(templateMappingSchema.safeParse(DEFAULT_MAPPING).success).toBe(true);
  });

  it("rejects invalid cell references", () => {
    expect(
      templateMappingSchema.safeParse({ ...DEFAULT_MAPPING, freelancerNameCell: "2B" }).success,
    ).toBe(false);
    expect(templateMappingSchema.safeParse({ ...DEFAULT_MAPPING, dateColumn: "A1" }).success).toBe(
      false,
    );
  });
});

describe("upload magic bytes", () => {
  it("detects PNG and JPEG, rejects others", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    const gif = Buffer.from("GIF89a");
    expect(sniffImage(png)).toBe("png");
    expect(sniffImage(jpeg)).toBe("jpeg");
    expect(sniffImage(gif)).toBeNull();
  });

  it("accepts real xlsx and refuses xlsm / macros / non-zip", async () => {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet("Sheet1");
    const real = Buffer.from(await workbook.xlsx.writeBuffer());
    expect(isXlsx(real, "gabarit.xlsx")).toBe(true);
    expect(isXlsx(real, "gabarit.XLSX")).toBe(true);
    expect(isXlsx(real, "gabarit.xlsm")).toBe(false);
    expect(isXlsx(Buffer.from("not a zip"), "gabarit.xlsx")).toBe(false);
    const macro = Buffer.concat([real, Buffer.from("vbaProject.bin")]);
    expect(isXlsx(macro, "gabarit.xlsx")).toBe(false);
  });
});

describe("buildCsv", () => {
  const data: ExportData = {
    timesheetId: "t",
    year: 2026,
    month: 1,
    periodLabel: "janvier 2026",
    consultant: "Alice Martin",
    mission: {
      id: "m",
      title: "Mission",
      unit: "day",
      hoursPerDay: 7,
      exportTemplateId: null,
    },
    client: { legalName: "Client", siret: null, address: null },
    profile: null,
    entries: [{ date: "2026-01-05", quantity: 0.5, type: "worked", comment: 'dit "bonjour"; ok' }],
    totals: {
      billableDays: 0.5,
      halfDays: 1,
      onCallDays: 0,
      leaveDays: 0,
      unavailableDays: 0,
      amountCents: 25000,
    },
  };

  it("produces UTF-8 BOM, semicolons and french decimals", () => {
    const csv = buildCsv(data);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("Date;Type;Quantité;Commentaire");
    expect(csv).toContain("2026-01-05;Travaillé;0,5;");
  });

  it("escapes comments containing separators or quotes", () => {
    const csv = buildCsv(data);
    expect(csv).toContain('"dit ""bonjour""; ok"');
  });

  it("neutralizes CSV formula injection", () => {
    const csv = buildCsv({
      ...data,
      entries: [{ date: "2026-01-05", quantity: 1, type: "worked", comment: "=1+1" }],
    });
    expect(csv).toContain("'=1+1");
    expect(csv).not.toContain(";=1+1");
  });
});

describe("upload hardening", () => {
  it("refuses a zip whose declared uncompressed size is a bomb", async () => {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet("Sheet1");
    const real = Buffer.from(await workbook.xlsx.writeBuffer());
    const forged = Buffer.from(real);
    // Patch every central-directory entry: uncompressed size = 0x7fffffff.
    for (let i = 0; i < forged.length - 4; i += 1) {
      if (forged.readUInt32LE(i) === 0x02014b50) {
        forged.writeUInt32LE(0x7fffffff, i + 24);
      }
    }
    expect(isXlsx(real, "ok.xlsx")).toBe(true);
    expect(isXlsx(forged, "bomb.xlsx")).toBe(false);
  });
});
