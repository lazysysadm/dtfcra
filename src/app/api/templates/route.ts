import { and, eq } from "drizzle-orm";
import { apiErrorResponse, getClientIp, requireApiUser } from "@/server/auth/helpers";
import { db } from "@/server/db";
import { exportTemplate, mission } from "@/server/db/schema";
import { DEFAULT_MAPPING, templateNameSchema } from "@/lib/validation/export-template";
import { logAudit } from "@/server/services/audit";
import { DomainError } from "@/server/services/errors";
import { getMission } from "@/server/services/missions";
import { enforceRateLimit } from "@/server/services/rate-limit";
import { MAX_TEMPLATE_BYTES, isXlsx, storeUpload } from "@/server/services/uploads";
import { headers } from "next/headers";

export async function POST(request: Request) {
  try {
    const session = await requireApiUser(request);
    await enforceRateLimit(`upload:${session.user.id}`, 10, 60);
    const form = await request.formData();
    const file = form.get("file");
    const name = String(form.get("name") ?? "");
    const missionId = String(form.get("missionId") ?? "") || null;
    const parsedName = templateNameSchema.safeParse(name);
    if (!parsedName.success) {
      throw new DomainError("VALIDATION", "Nom de modèle requis (100 caractères max).");
    }
    if (!(file instanceof File)) {
      throw new DomainError("VALIDATION", "Fichier manquant.");
    }
    if (file.size > MAX_TEMPLATE_BYTES) {
      throw new DomainError("VALIDATION", "Gabarit trop volumineux (5 Mo max).");
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!isXlsx(buffer, file.name)) {
      throw new DomainError("VALIDATION", "Format invalide : .xlsx uniquement (pas de macros).");
    }
    if (missionId) {
      await getMission(session.user.id, missionId);
    }
    const filePath = await storeUpload("templates", buffer, "xlsx");
    const inserted = await db
      .insert(exportTemplate)
      .values({
        userId: session.user.id,
        name: parsedName.data,
        filePath,
        mapping: DEFAULT_MAPPING,
      })
      .returning();
    const template = inserted[0];
    if (!template) {
      throw new DomainError("INTERNAL", "Template creation failed");
    }
    if (missionId) {
      await db
        .update(mission)
        .set({ exportTemplateId: template.id })
        .where(and(eq(mission.id, missionId), eq(mission.userId, session.user.id)));
    }
    await logAudit({
      userId: session.user.id,
      actor: "user",
      action: "export_template.create",
      entity: "export_template",
      entityId: template.id,
      ip: getClientIp(await headers()),
    });
    return Response.json({ id: template.id });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
