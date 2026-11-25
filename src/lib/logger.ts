import pino from "pino";
import { env } from "@/env";

// Strip query parameters from serialized errors (pg errors may carry them).
function safeErr(err: unknown) {
  const serialized = pino.stdSerializers.err(err as Error) as Record<string, unknown>;
  delete serialized.parameters;
  delete serialized.query;
  return serialized;
}

export const logger = pino({
  level: env.LOG_LEVEL,
  serializers: { err: safeErr },
  redact: {
    paths: [
      "password",
      "*.password",
      "**.password",
      "token",
      "*.token",
      "**.token",
      "otp",
      "*.otp",
      "*.code",
      "*.secret",
      "signature",
      "*.signature",
      "authorization",
      "cookie",
      "req.headers.authorization",
      "req.headers.cookie",
      'req.headers["set-cookie"]',
    ],
    censor: "[REDACTED]",
  },
});
