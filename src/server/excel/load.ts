import ExcelJS from "exceljs";

// ExcelJS bundles older Buffer typings than @types/node 26; the runtime value
// is a real Node Buffer, hence the single localized cast.
export async function loadWorkbook(buffer: Buffer): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  return workbook;
}
