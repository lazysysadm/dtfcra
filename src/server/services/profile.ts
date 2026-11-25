import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { freelancerProfile } from "@/server/db/schema";
import type { ProfileInput } from "@/lib/validation/referential";
import { logAudit } from "./audit";

export async function getProfile(userId: string) {
  const rows = await db
    .select()
    .from(freelancerProfile)
    .where(eq(freelancerProfile.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertProfile(userId: string, input: ProfileInput) {
  const rows = await db
    .insert(freelancerProfile)
    .values({ userId, ...input })
    .onConflictDoUpdate({
      target: freelancerProfile.userId,
      set: { ...input, updatedAt: new Date() },
    })
    .returning();
  const profile = rows[0];
  await logAudit({
    userId,
    actor: "user",
    action: "profile.upsert",
    entity: "freelancer_profile",
    entityId: profile?.id,
  });
  return profile;
}
