import { sql } from "drizzle-orm";
import { db } from "@/server/db";
import { publicRateLimit } from "@/server/db/schema";
import { DomainError } from "./errors";

// Atomic fixed-window counter stored in PostgreSQL (no Redis, no job).
// Returns true when the request is allowed, false when the limit is reached.
export async function checkPublicRateLimit(
  key: string,
  max: number,
  windowSeconds: number,
): Promise<boolean> {
  const expired = sql`${publicRateLimit.windowStart} < now() - make_interval(secs => ${windowSeconds}::float8)`;
  const result = await db
    .insert(publicRateLimit)
    .values({ key, count: 1, windowStart: new Date() })
    .onConflictDoUpdate({
      target: publicRateLimit.key,
      set: {
        count: sql`case when ${expired} then 1 else ${publicRateLimit.count} + 1 end`,
        windowStart: sql`case when ${expired} then now() else ${publicRateLimit.windowStart} end`,
      },
    })
    .returning({ count: publicRateLimit.count });
  const count = result[0]?.count ?? max + 1;
  return count <= max;
}

// Opportunistic purge of stale counters (no scheduled job).
export async function purgeExpiredRateLimits(): Promise<void> {
  await db
    .delete(publicRateLimit)
    .where(sql`${publicRateLimit.windowStart} < now() - interval '1 day'`);
}

// Throw RATE_LIMITED when the window limit is exceeded; purge occasionally.
export async function enforceRateLimit(
  key: string,
  max: number,
  windowSeconds: number,
): Promise<void> {
  const allowed = await checkPublicRateLimit(key, max, windowSeconds);
  if (Math.random() < 0.02) {
    await purgeExpiredRateLimits();
  }
  if (!allowed) {
    throw new DomainError("RATE_LIMITED", "Too many requests");
  }
}
