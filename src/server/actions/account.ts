"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { verifyPassword } from "better-auth/crypto";
import { db } from "@/server/db";
import { account, exportTemplate, freelancerProfile, user } from "@/server/db/schema";
import { getClientIp, requireUser } from "@/server/auth/helpers";
import { logAudit } from "@/server/services/audit";
import { logger } from "@/lib/logger";
import { deleteUpload } from "@/server/services/uploads";
import { fail, type ActionResult } from "./result";

export type { ActionResult } from "./result";

// RGPD: delete the account, all its data (DB cascades) AND its uploaded files.
// Requires the current password (re-auth) so a stolen cookie alone is not enough.
export async function deleteAccountAction(password: string): Promise<ActionResult> {
  try {
    const { user: sessionUser } = await requireUser();
    const credentials = await db
      .select({ password: account.password })
      .from(account)
      .where(and(eq(account.userId, sessionUser.id), eq(account.providerId, "credential")))
      .limit(1);
    const hash = credentials[0]?.password;
    if (!hash || !(await verifyPassword({ hash, password }))) {
      return { success: false, error: "Mot de passe incorrect." };
    }

    // Collect uploaded files before the cascade removes the rows.
    const profiles = await db
      .select({ logoPath: freelancerProfile.logoPath })
      .from(freelancerProfile)
      .where(eq(freelancerProfile.userId, sessionUser.id));
    const templates = await db
      .select({ filePath: exportTemplate.filePath })
      .from(exportTemplate)
      .where(eq(exportTemplate.userId, sessionUser.id));
    const files = [
      ...profiles.map((row) => row.logoPath),
      ...templates.map((row) => row.filePath),
    ].filter((path): path is string => Boolean(path));

    await logAudit({
      userId: sessionUser.id,
      actor: "user",
      action: "account.delete",
      entity: "user",
      entityId: sessionUser.id,
      ip: getClientIp(await headers()),
    });
    await db.delete(user).where(eq(user.id, sessionUser.id));

    for (const file of files) {
      try {
        await deleteUpload(file);
      } catch (error) {
        logger.error({ err: error }, "failed to delete user upload during account removal");
      }
    }
    return { success: true };
  } catch (error) {
    return fail(error);
  }
}
