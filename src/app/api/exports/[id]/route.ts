import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { auth } from "@/server/auth";
import { apiErrorResponse } from "@/server/auth/helpers";
import { db } from "@/server/db";
import { exportTemplate } from "@/server/db/schema";
import { buildCsv } from "@/server/excel/csv";
import { buildStandardXlsx } from "@/server/excel/standard";
import { fillTemplate } from "@/server/excel/template";
import { buildCraPdf } from "@/server/pdf";
import { templateMappingSchema } from "@/lib/validation/export-template";
import { DomainError } from "@/server/services/errors";
import { exportFilename, getExportData } from "@/server/services/exports";
import { enforceRateLimit } from "@/server/services/rate-limit";
import { readUpload } from "@/server/services/uploads";

const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function attachment(body: BodyInit, type: string, filename: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": type,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      throw new DomainError("UNAUTHORIZED", "Authentication required");
    }
    await enforceRateLimit(`export:${session.user.id}`, 30, 60);
    const { id } = await params;
    const format = new URL(request.url).searchParams.get("format") ?? "pdf";
    const data = await getExportData(session.user.id, id);
    if (format === "csv") {
      return attachment(buildCsv(data), "text/csv; charset=utf-8", exportFilename(data, "csv"));
    }
    if (format === "xlsx") {
      const buffer = await buildStandardXlsx(data);
      return attachment(new Uint8Array(buffer), XLSX_TYPE, exportFilename(data, "xlsx"));
    }
    if (format === "template") {
      if (!data.mission.exportTemplateId) {
        throw new DomainError("VALIDATION", "No export template assigned to this mission");
      }
      const rows = await db
        .select()
        .from(exportTemplate)
        .where(
          and(
            eq(exportTemplate.id, data.mission.exportTemplateId),
            eq(exportTemplate.userId, session.user.id),
          ),
        )
        .limit(1);
      const template = rows[0];
      if (!template) {
        throw new DomainError("NOT_FOUND", "Template not found");
      }
      const parsed = templateMappingSchema.safeParse(template.mapping);
      if (!parsed.success) {
        throw new DomainError("VALIDATION", "Invalid template mapping");
      }
      const buffer = await fillTemplate(await readUpload(template.filePath), parsed.data, data);
      return attachment(new Uint8Array(buffer), XLSX_TYPE, exportFilename(data, "xlsx"));
    }
    const buffer = await buildCraPdf(data);
    return attachment(new Uint8Array(buffer), "application/pdf", exportFilename(data, "pdf"));
  } catch (error) {
    return apiErrorResponse(error);
  }
}
