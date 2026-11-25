import { afterAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { db, pool } from "@/server/db";
import { loginLockout } from "@/server/db/schema";
import {
  assertNotLocked,
  purgeExpiredLockouts,
  recordLoginFailure,
  resetLoginFailures,
} from "@/server/services/lockout";

const KEY = "lockou…ocal";
const PURGE_KEY = "lockou…ocal";
const LOCKED_KEY = "lockou…ocal";

afterAll(async () => {
  await db.delete(loginLockout).where(eq(loginLockout.key, KEY));
  await db.delete(loginLockout).where(eq(loginLockout.key, PURGE_KEY));
  await db.delete(loginLockout).where(eq(loginLockout.key, LOCKED_KEY));
  await pool.end();
});

describe("progressive sign-in lockout", () => {
  it("does not lock before the threshold", async () => {
    await resetLoginFailures(KEY);
    for (let i = 0; i < 4; i += 1) {
      await recordLoginFailure(KEY);
    }
    await expect(assertNotLocked(KEY)).resolves.toBeUndefined();
  });

  it("locks after the threshold and unlocks on reset", async () => {
    await recordLoginFailure(KEY); // 5th failure
    await expect(assertNotLocked(KEY)).rejects.toMatchObject({ code: "RATE_LIMITED" });
    await resetLoginFailures(KEY);
    await expect(assertNotLocked(KEY)).resolves.toBeUndefined();
  });

  it("increments atomically under concurrent calls", async () => {
    await resetLoginFailures(KEY);
    const n = 12;
    await Promise.all(Array.from({ length: n }, () => recordLoginFailure(KEY)));
    const rows = await db.select().from(loginLockout).where(eq(loginLockout.key, KEY)).limit(1);
    expect(rows[0]?.failures).toBe(n);
    await resetLoginFailures(KEY);
  });
});

describe("lockout purge", () => {
  it("purges stale unlocked rows but keeps locked rows", async () => {
    const suffix = Date.now();
    const purgeKey = `lockout-purge-${suffix}@test.local`;
    const lockedKey = `lockout-locked-${suffix}@test.local`;
    const old = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await db.execute(
      sql`insert into login_lockout (key, failures, locked_until, updated_at)
          values (${purgeKey}, 3, null, ${old})`,
    );
    await db.execute(
      sql`insert into login_lockout (key, failures, locked_until, updated_at)
          values (${lockedKey}, 8, ${future}, ${old})`,
    );

    await purgeExpiredLockouts();

    const purged = await db.select().from(loginLockout).where(eq(loginLockout.key, purgeKey));
    const locked = await db.select().from(loginLockout).where(eq(loginLockout.key, lockedKey));
    await db.delete(loginLockout).where(eq(loginLockout.key, lockedKey));
    expect(purged).toHaveLength(0);
    expect(locked).toHaveLength(1);
  });
});
