import ExcelJS from "exceljs";
import { ENTRY_TYPE_LABELS } from "@/lib/timesheet";
import type { ExportData } from "@/server/services/exports";

export async function buildStandardXlsx(data: ExportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "dtfcra";
  const sheet = workbook.addWorksheet("CRA");
  sheet.columns = [{ width: 14 }, { width: 18 }, { width: 12 }, { width: 50 }];

  sheet.addRow(["dtfcra — Compte rendu d'activité"]).font = { bold: true, size: 14 };
  sheet.addRow(["Freelance", data.profile?.legalName ?? ""]);
  sheet.addRow(["Consultant", data.consultant]);
  sheet.addRow(["Client", data.client.legalName]);
  sheet.addRow(["Mission", data.mission.title]);
  sheet.addRow(["Période", data.periodLabel]);
  sheet.addRow([]);
  const header = sheet.addRow(["Date", "Type", "Quantité", "Commentaire"]);
  header.font = { bold: true };
  for (const entry of data.entries) {
    sheet.addRow([entry.date, ENTRY_TYPE_LABELS[entry.type], entry.quantity, entry.comment ?? ""]);
  }
  sheet.addRow([]);
  const totalDays = sheet.addRow(["Total jours facturables", "", data.totals.billableDays, ""]);
  totalDays.font = { bold: true };
  sheet.addRow(["Demi-journées", "", data.totals.halfDays, ""]);
  sheet.addRow(["Astreintes", "", data.totals.onCallDays, ""]);
  sheet.addRow(["Congés / absences", "", data.totals.leaveDays + data.totals.unavailableDays, ""]);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
