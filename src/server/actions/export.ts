"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { exportTemplate, mission } from "@/server/db/schema";
import { templateMappingSchema } from "@/lib/validation/export-template";
import { requireUser } from "@/server/auth/helpers";
import { logAudit } from "@/server/services/audit";
import { getMission } from "@/server/services/missions";
import { deleteUpload } from "@/server/services/uploads";
import { DomainError } from "@/server/services/errors";
import { fail, idSchema, type ActionResult } from "./result";

export type { ActionResult } from "./result";

async function getOwnedTemplate(userId: string, templateId: string) {
  const rows = await db
    .select()
    .from(exportTemplate)
    .where(and(eq(exportTemplate.id, templateId), eq(exportTemplate.userId, userId)))
    .limit(1);
  const row = rows[0];
  if (!row) {
    throw new DomainError("NOT_FOUND", "Template not found");
  }
  return row;
}

export async function updateMappingAction(
  templateId: string,
  mapping: unknown,
): Promise<ActionResult> {
  try {
    const { user } = await requireUser();
    await getOwnedTemplate(user.id, idSchema.parse(templateId));
    const parsed = templateMappingSchema.parse(mapping);
    await db
      .update(exportTemplate)
      .set({ mapping: parsed })
      .where(and(eq(exportTemplate.id, templateId), eq(exportTemplate.userId, user.id)));
    await logAudit({
      userId: user.id,
      actor: "user",
      action: "export_template.mapping",
      entity: "export_template",
      entityId: templateId,
    });
    revalidatePath("/missions", "layout");
    return { success: true };
  } catch (error) {
    return fail(error);
  }
}

export async function assignTemplateAction(
  missionId: string,
  templateId: string | null,
): Promise<ActionResult> {
  try {
    const { user } = await requireUser();
    await getMission(user.id, idSchema.parse(missionId));
    if (templateId) {
      await getOwnedTemplate(user.id, idSchema.parse(templateId));
    }
    await db
      .update(mission)
      .set({ exportTemplateId: templateId })
      .where(and(eq(mission.id, missionId), eq(mission.userId, user.id)));
    revalidatePath("/missions", "layout");
    revalidatePath("/cra");
    return { success: true };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteTemplateAction(templateId: string): Promise<ActionResult> {
  try {
    const { user } = await requireUser();
    const template = await getOwnedTemplate(user.id, idSchema.parse(templateId));
    await db
      .delete(exportTemplate)
      .where(and(eq(exportTemplate.id, templateId), eq(exportTemplate.userId, user.id)));
    await deleteUpload(template.filePath);
    await logAudit({
      userId: user.id,
      actor: "user",
      action: "export_template.delete",
      entity: "export_template",
      entityId: templateId,
    });
    revalidatePath("/missions", "layout");
    return { success: true };
  } catch (error) {
    return fail(error);
  }
}
