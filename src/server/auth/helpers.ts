import { headers } from "next/headers";
import { z } from "zod";
import { env } from "@/env";
import { logger } from "@/lib/logger";
import { DomainError } from "@/server/services/errors";
import { auth, trustedOrigins } from "./index";

// Real client IP for audit/rate-limit. Only trust X-Forwarded-For when a
// TRUSTED_PROXY is configured; otherwise ignore it (spoofable) and return null.
export function getClientIp(requestHeaders: Headers): string | null {
  if (!env.TRUSTED_PROXY) {
    return null;
  }
  const forwarded = requestHeaders.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }
  return requestHeaders.get("x-real-ip")?.trim() || null;
}

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireUser() {
  const session = await getSession();
  if (!session) {
    throw new DomainError("UNAUTHORIZED", "Authentication required");
  }
  return session;
}

// CSRF guard for mutating route handlers (Server Actions have native origin
// checks). A foreign Origin is always refused. A missing Origin is accepted
// only for same-origin / non-browser requests (Sec-Fetch-Site), never cross-site.
export function assertOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (origin) {
    if (!trustedOrigins.includes(origin)) {
      throw new DomainError("FORBIDDEN", "Origin not allowed");
    }
    return;
  }
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    throw new DomainError("FORBIDDEN", "Cross-site request blocked");
  }
}

// Session + CSRF guard for API route handlers (replaces duplicated getSession).
export async function requireApiUser(request: Request) {
  assertOrigin(request);
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    throw new DomainError("UNAUTHORIZED", "Authentication required");
  }
  return session;
}

const HTTP_STATUS: Record<string, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION: 422,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

// Uniform JSON error response for API routes (no detail leakage, structured log).
export function apiErrorResponse(error: unknown): Response {
  if (error instanceof DomainError) {
    return Response.json({ error: error.message }, { status: HTTP_STATUS[error.code] ?? 500 });
  }
  if (error instanceof z.ZodError) {
    return Response.json(
      { error: error.issues[0]?.message ?? "Données invalides." },
      { status: 422 },
    );
  }
  logger.error({ err: error }, "api error");
  return Response.json({ error: "Erreur interne." }, { status: 500 });
}
