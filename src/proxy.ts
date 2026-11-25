import { NextResponse, type NextRequest } from "next/server";

// Security headers. Next 16 uses proxy.ts, not middleware.ts.
export default function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("base64");
  const isDev = process.env.NODE_ENV === "development";

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // style-src 'unsafe-inline' is required by Tailwind/React inline styles.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  // Next reads the nonce from the request CSP header to nonce its scripts.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), publickey-credentials-get=(self), publickey-credentials-create=(self)",
  );
  response.headers.set("X-Frame-Options", "DENY");
  // Authenticated pages must never be cached by a shared reverse proxy.
  response.headers.set("Cache-Control", "private, no-store");
  if (!isDev) {
    response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
    // COOP/CORP require a trustworthy origin (https); applying them in dev over
    // http breaks cross-origin container navigation (E2E).
    response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
    response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  }
  return response;
}

export const config = {
  // Exclude all Next internals (_next/static, _next/image, _next/hmr WebSocket):
  // intercepting the HMR upgrade breaks dev hydration.
  matcher: ["/((?!_next/|favicon.ico).*)"],
};
