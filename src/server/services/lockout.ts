import { eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { loginLockout } from "@/server/db/schema";
import { DomainError } from "./errors";

const MAX_BACKOFF_SECONDS = 3600;
const LOCK_THRESHOLD = 5;

// Opportunistic purge of stale rows (no scheduled job): unlocked/expired AND
// inactive for over a day. Locked rows are never purged.
export async function purgeExpiredLockouts(): Promise<void> {
  await db.delete(loginLockout).where(
    sql`(${loginLockout.lockedUntil} is null or ${loginLockout.lockedUntil} < now())
        and ${loginLockout.updatedAt} < now() - interval '1 day'`,
  );
}

// Progressive lockout: after LOCK_THRESHOLD failures, lock for min(2^n, 1h).
export async function assertNotLocked(key: string): Promise<void> {
  if (Math.random() < 0.02) {
    await purgeExpiredLockouts();
  }
  const rows = await db.select().from(loginLockout).where(eq(loginLockout.key, key)).limit(1);
  const row = rows[0];
  if (row?.lockedUntil && row.lockedUntil.getTime() > Date.now()) {
    throw new DomainError("RATE_LIMITED", "Account temporarily locked");
  }
}

// Atomic increment: a single upsert increments failures in SQL and derives
// lockedUntil in the same statement (no SELECT-then-write race).
export async function recordLoginFailure(key: string): Promise<void> {
  const newFailures = sql`${loginLockout.failures} + 1`;
  await db
    .insert(loginLockout)
    .values({ key, failures: 1, lockedUntil: null, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: loginLockout.key,
      set: {
        failures: newFailures,
        updatedAt: new Date(),
        lockedUntil: sql`case when ${newFailures} >= ${LOCK_THRESHOLD}
          then now() + make_interval(secs => least(power(2, ${newFailures}), ${MAX_BACKOFF_SECONDS}))
          else null end`,
      },
    });
}

export async function resetLoginFailures(key: string): Promise<void> {
  await db.delete(loginLockout).where(eq(loginLockout.key, key));
}
