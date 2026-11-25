import { ENTRY_TYPE_LABELS } from "@/lib/timesheet";
import type { ExportData } from "@/server/services/exports";

function csvCell(value: string): string {
  // CSV injection guard: neutralize leading formula triggers (= + - @ tab CR).
  let safe = value;
  if (/^[=+\-@\t\r]/.test(safe)) {
    safe = `'${safe}`;
  }
  if (/[;"\r\n]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

function decimal(value: number): string {
  return String(value).replace(".", ",");
}

// CSV français : séparateur ";", UTF-8 avec BOM pour Excel.
export function buildCsv(data: ExportData): string {
  const lines: string[] = [];
  lines.push(["Date", "Type", "Quantité", "Commentaire"].join(";"));
  for (const entry of data.entries) {
    lines.push(
      [
        entry.date,
        ENTRY_TYPE_LABELS[entry.type],
        decimal(entry.quantity),
        csvCell(entry.comment ?? ""),
      ].join(";"),
    );
  }
  lines.push("");
  lines.push(["Total jours facturables", "", decimal(data.totals.billableDays), ""].join(";"));
  lines.push(["Demi-journées", "", String(data.totals.halfDays), ""].join(";"));
  lines.push(["Astreintes", "", decimal(data.totals.onCallDays), ""].join(";"));
  lines.push(
    [
      "Congés / absences",
      "",
      decimal(data.totals.leaveDays + data.totals.unavailableDays),
      "",
    ].join(";"),
  );
  const header = [
    `Freelance;${csvCell(data.profile?.legalName ?? "")}`,
    `Consultant;${csvCell(data.consultant)}`,
    `Client;${csvCell(data.client.legalName)}`,
    `Mission;${csvCell(data.mission.title)}`,
    `Période;${data.periodLabel}`,
    "",
  ];
  return `\uFEFF${[...header, ...lines].join("\r\n")}\r\n`;
}
