import { asc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { exportTemplate } from "@/server/db/schema";

export async function listTemplates(userId: string) {
  return db
    .select()
    .from(exportTemplate)
    .where(eq(exportTemplate.userId, userId))
    .orderBy(asc(exportTemplate.name));
}
