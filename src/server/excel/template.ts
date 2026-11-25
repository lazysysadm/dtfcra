import ExcelJS from "exceljs";
import { ENTRY_TYPE_LABELS } from "@/lib/timesheet";
import type { TemplateMapping } from "@/lib/validation/export-template";
import type { ExportData } from "@/server/services/exports";
import { loadWorkbook } from "./load";

function setCell(sheet: ExcelJS.Worksheet, ref: string | null | undefined, value: string | number) {
  if (ref) {
    const cell = sheet.getCell(ref);
    cell.value = value;
    // Force text format so a client template cannot interpret strings as formulas.
    if (typeof value === "string") {
      cell.numFmt = "@";
    }
  }
}

// Fills the client's .xlsx template, preserving its formatting.
export async function fillTemplate(
  templateBuffer: Buffer,
  mapping: TemplateMapping,
  data: ExportData,
): Promise<Buffer> {
  const workbook = await loadWorkbook(templateBuffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new Error("Template has no worksheet");
  }

  setCell(sheet, mapping.freelancerNameCell, data.profile?.legalName ?? "");
  setCell(sheet, mapping.consultantNameCell, data.consultant);
  setCell(sheet, mapping.clientNameCell, data.client.legalName);
  setCell(sheet, mapping.missionTitleCell, data.mission.title);
  setCell(sheet, mapping.periodCell, data.periodLabel);

  let row = mapping.daysStartRow;
  for (const entry of data.entries) {
    sheet.getCell(`${mapping.dateColumn}${row}`).value = entry.date;
    sheet.getCell(`${mapping.quantityColumn}${row}`).value = entry.quantity;
    if (mapping.typeColumn) {
      sheet.getCell(`${mapping.typeColumn}${row}`).value = ENTRY_TYPE_LABELS[entry.type];
    }
    if (mapping.commentColumn) {
      sheet.getCell(`${mapping.commentColumn}${row}`).value = entry.comment ?? "";
    }
    row += 1;
  }

  setCell(sheet, mapping.totalDaysCell, data.totals.billableDays);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
