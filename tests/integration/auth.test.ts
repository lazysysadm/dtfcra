import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { auth } from "@/server/auth";
import { db, pool } from "@/server/db";
import * as schema from "@/server/db/schema";
import { listAuditLogs, logAudit } from "@/server/services/audit";
import { checkPublicRateLimit } from "@/server/services/rate-limit";

// Integration tests — run against the real PostgreSQL container (dev or CI).
const PASSWORD = "Correct-Horse-Battery-9!";
const EMAIL_A = "alice@test.local";
const EMAIL_B = "bob@test.local";
const UUID_V7_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

let userAId = "";
let userBId = "";

function cookieHeaders(response: Response): Headers {
  const cookies = response.headers.getSetCookie().map((cookie) => cookie.split(";")[0] ?? "");
  return new Headers({ cookie: cookies.join("; ") });
}

beforeAll(async () => {
  await db.delete(schema.user).where(inArray(schema.user.email, [EMAIL_A, EMAIL_B]));
  await db.delete(schema.rateLimit);
  await db.delete(schema.publicRateLimit);
  const a = await auth.api.signUpEmail({
    body: { name: "Alice", email: EMAIL_A, password: PASSWORD },
  });
  const b = await auth.api.signUpEmail({
    body: { name: "Bob", email: EMAIL_B, password: PASSWORD },
  });
  userAId = a.user.id;
  userBId = b.user.id;
});

afterAll(async () => {
  await db.delete(schema.auditLog).where(inArray(schema.auditLog.userId, [userAId, userBId]));
  await db.delete(schema.publicRateLimit).where(eq(schema.publicRateLimit.key, "test:rl"));
  await db.delete(schema.user).where(inArray(schema.user.email, [EMAIL_A, EMAIL_B]));
  await pool.end();
});

describe("authentication (integration)", () => {
  it("creates users with UUID v7 identifiers", () => {
    expect(userAId).toMatch(UUID_V7_REGEX);
    expect(userBId).toMatch(UUID_V7_REGEX);
  });

  it("signs in and returns a session cookie scoped to the user", async () => {
    const response = await auth.api.signInEmail({
      body: { email: EMAIL_A, password: PASSWORD },
      asResponse: true,
    });
    expect(response.status).toBe(200);
    const session = await auth.api.getSession({ headers: cookieHeaders(response) });
    expect(session?.user.id).toBe(userAId);
    expect(session?.user.email).toBe(EMAIL_A);
  });

  it("rejects a wrong password", async () => {
    await expect(
      auth.api.signInEmail({ body: { email: EMAIL_A, password: "Wrong-Password-123!" } }),
    ).rejects.toThrow();
  });

  it("rejects a compromised password at sign-up", async () => {
    await expect(
      auth.api.signUpEmail({
        body: { name: "Mallory", email: "mallory@test.local", password: "123456789012" },
      }),
    ).rejects.toThrow();
  });

  it("rejects a password shorter than 12 characters", async () => {
    await expect(
      auth.api.signUpEmail({
        body: { name: "Mallory", email: "mallory@test.local", password: "Court-9!" },
      }),
    ).rejects.toThrow();
  });
});

describe("tenant isolation (IDOR)", () => {
  it("listAuditLogs never returns another user's entries", async () => {
    await logAudit({ userId: userAId, actor: "user", action: "test.a" });
    await logAudit({ userId: userBId, actor: "user", action: "test.b" });
    const logsA = await listAuditLogs(userAId);
    expect(logsA.length).toBeGreaterThan(0);
    for (const entry of logsA) {
      expect(entry.userId).toBe(userAId);
    }
    expect(logsA.some((entry) => entry.action === "test.a")).toBe(true);
    expect(logsA.some((entry) => entry.action === "test.b")).toBe(false);
  });

  it("a session of user A never resolves to user B", async () => {
    const response = await auth.api.signInEmail({
      body: { email: EMAIL_A, password: PASSWORD },
      asResponse: true,
    });
    const session = await auth.api.getSession({ headers: cookieHeaders(response) });
    expect(session?.user.id).not.toBe(userBId);
  });
});

describe("public rate limiter (integration)", () => {
  it("allows up to max requests then blocks within the window", async () => {
    expect(await checkPublicRateLimit("test:rl", 3, 60)).toBe(true);
    expect(await checkPublicRateLimit("test:rl", 3, 60)).toBe(true);
    expect(await checkPublicRateLimit("test:rl", 3, 60)).toBe(true);
    expect(await checkPublicRateLimit("test:rl", 3, 60)).toBe(false);
  });
});
