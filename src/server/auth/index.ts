import { betterAuth } from "better-auth";
import { sql } from "drizzle-orm";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { twoFactor } from "better-auth/plugins";
import { passkey } from "@better-auth/passkey";
import { env } from "@/env";
import { isCompromisedPassword } from "@/lib/validation/password";
import { uuidv7 } from "@/lib/uuid";
import { db } from "@/server/db";
import * as schema from "@/server/db/schema";
import { enforceRateLimit } from "@/server/services/rate-limit";
import { assertNotLocked, recordLoginFailure, resetLoginFailures } from "@/server/services/lockout";
import { logAudit } from "@/server/services/audit";
import { DomainError } from "@/server/services/errors";
import { canSignUp } from "./signup-policy";

const isProduction = env.NODE_ENV === "production";
const appUrl = new URL(env.APP_URL);

// In dev, localhost and 127.0.0.1 are both used (passkeys require localhost);
// accept both spellings of the same host:port. Production: APP_URL only.
const portSuffix = appUrl.port ? `:${appUrl.port}` : "";
export const trustedOrigins = isProduction
  ? [env.APP_URL]
  : [
      env.APP_URL,
      `${appUrl.protocol}//localhost${portSuffix}`,
      `${appUrl.protocol}//127.0.0.1${portSuffix}`,
      // E2E container reaches the dev server by its podman hostname.
      `${appUrl.protocol}//dtfcra-app${portSuffix}`,
    ];

const PASSWORD_PATHS = new Set([
  "/sign-up/email",
  "/change-password",
  "/set-password",
  "/reset-password",
]);

// Security-relevant endpoints recorded in the audit trail (after hook).
const AUDITED_PATHS: Record<string, string> = {
  "/sign-in/email": "auth.sign_in",
  "/two-factor/enable": "auth.2fa_enable",
  "/two-factor/disable": "auth.2fa_disable",
  "/two-factor/verify-totp": "auth.2fa_verify",
  "/two-factor/verify-backup-code": "auth.2fa_backup_verify",
  "/passkey/verify-registration": "auth.passkey_add",
  "/passkey/delete-passkey": "auth.passkey_delete",
  "/revoke-session": "auth.session_revoke",
  "/revoke-sessions": "auth.sessions_revoke_all",
  "/revoke-other-sessions": "auth.sessions_revoke_others",
  "/change-password": "auth.password_change",
};

export const auth = betterAuth({
  appName: "dtfcra",
  baseURL: env.APP_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  trustedOrigins,
  telemetry: { enabled: false },
  emailAndPassword: {
    enabled: true,
    // No email is ever sent by dtfcra.
    requireEmailVerification: false,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    autoSignIn: true,
    revokeSessionsOnPasswordReset: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 60,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 3600, max: 5 },
      "/two-factor/verify-totp": { window: 60, max: 5 },
      "/two-factor/verify-backup-code": { window: 60, max: 5 },
    },
  },
  advanced: {
    database: {
      generateId: () => uuidv7(),
    },
    // Secure attribute is managed explicitly below so production session
    // cookies can use the __Host- prefix.
    useSecureCookies: false,
    cookiePrefix: "dtfcra",
    defaultCookieAttributes: {
      sameSite: "lax",
      path: "/",
      httpOnly: true,
      secure: isProduction,
    },
    cookies: isProduction ? { session_token: { name: "__Host-session_token" } } : undefined,
    ipAddress: {
      ipAddressHeaders: ["x-forwarded-for"],
      trustedProxies: env.TRUSTED_PROXY ? [env.TRUSTED_PROXY] : undefined,
    },
  },
  plugins: [
    twoFactor({ issuer: "dtfcra" }),
    passkey({ rpID: appUrl.hostname, rpName: "dtfcra", origin: env.APP_URL }),
  ],
  hooks: {
    before: async (ctx) => {
      // better-call types the middleware context loosely; path/body are
      // present at runtime (verified against dist/api/dispatch.mjs).
      const { path, body } = ctx as { path?: string; body?: Record<string, unknown> };
      if (path === "/sign-in/email" && typeof body?.email === "string") {
        const accountKey = body.email.trim().toLowerCase();
        // Per-account limit on top of the per-IP rule: defeats distributed guessing.
        try {
          await enforceRateLimit(`signin:${accountKey}`, 10, 900);
        } catch (error) {
          if (error instanceof DomainError && error.code === "RATE_LIMITED") {
            throw new APIError("TOO_MANY_REQUESTS", {
              message: "Too many attempts. Try again later.",
            });
          }
          throw error;
        }
        try {
          await assertNotLocked(accountKey);
        } catch (error) {
          if (error instanceof DomainError && error.code === "RATE_LIMITED") {
            // Identical generic error to a failed sign-in: never reveal that the
            // account exists (or is locked) — anti-enumeration / anti-DoS.
            throw new APIError("UNAUTHORIZED", { message: "Invalid email or password." });
          }
          throw error;
        }
      }
      if (!path || !PASSWORD_PATHS.has(path)) {
        return;
      }
      const password = body?.password ?? body?.newPassword;
      if (typeof password === "string" && isCompromisedPassword(password)) {
        throw new APIError("BAD_REQUEST", {
          message: "Password is too common (compromised password list).",
        });
      }
    },
    after: createAuthMiddleware(async (ctx) => {
      const { path, context, body } = ctx as {
        path?: string;
        body?: { email?: string };
        context?: {
          returned?: unknown;
          session?: { user?: { id?: string } } | null;
          newSession?: { user?: { id?: string } } | null;
        };
      };
      const failed = context?.returned instanceof APIError;
      // Progressive lockout bookkeeping for email sign-in. Only record failures
      // for accounts that exist: never create rows for invented emails (anti-DoS).
      if (path === "/sign-in/email" && typeof body?.email === "string") {
        const accountKey = body.email.trim().toLowerCase();
        try {
          if (failed) {
            const existing = await db
              .select({ id: schema.user.id })
              .from(schema.user)
              .where(sql`lower(${schema.user.email}) = ${accountKey}`)
              .limit(1);
            if (existing.length > 0) {
              await recordLoginFailure(accountKey);
            }
          } else {
            await resetLoginFailures(accountKey);
          }
        } catch {
          // Lockout bookkeeping must never break authentication.
        }
      }
      const action = path ? AUDITED_PATHS[path] : undefined;
      if (!action) {
        return;
      }
      const userId = context?.newSession?.user?.id ?? context?.session?.user?.id ?? null;
      // Failed sign-ins have no user context here: logged without a user id.
      try {
        await logAudit({
          userId,
          actor: "user",
          action: failed ? `${action}_failed` : action,
        });
      } catch {
        // Audit must never break authentication.
      }
    }),
  },
  databaseHooks: {
    user: {
      create: {
        before: async (_user, context) => {
          // Internal creations (CLI, seed) have no HTTP context.
          if (!context) {
            return;
          }
          const existing = await db.select({ id: schema.user.id }).from(schema.user).limit(1);
          if (!canSignUp(existing.length, env.ALLOW_SIGNUP === "true")) {
            throw new APIError("FORBIDDEN", { message: "Signup is disabled." });
          }
        },
      },
    },
  },
});
