import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z
      .url()
      .refine((value) => value.startsWith("postgres://") || value.startsWith("postgresql://"), {
        message: "DATABASE_URL must be a PostgreSQL URL (postgres:// or postgresql://)",
      }),
    APP_URL: z.url().default("http://127.0.0.1:3000"),
    BETTER_AUTH_SECRET: z.string().min(32),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
    ALLOW_SIGNUP: z.enum(["true", "false"]).default("false"),
    TRUSTED_PROXY: z.string().optional(),
    UPLOAD_DIR: z.string().default("uploads"),
    ALLOW_INSECURE_APP_URL: z.enum(["true", "false"]).default("false"),
    ALLOW_NO_TRUSTED_PROXY: z.enum(["true", "false"]).default("false"),
  })
  .superRefine((data, ctx) => {
    // __Host- cookies require Secure; an http:// APP_URL in production would
    // silently break authentication. Skipped during the production build phase.
    const isBuild = process.env.NEXT_PHASE === "phase-production-build";
    if (
      data.NODE_ENV === "production" &&
      !isBuild &&
      data.ALLOW_INSECURE_APP_URL !== "true" &&
      !data.APP_URL.startsWith("https://")
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["APP_URL"],
        message: "APP_URL must use https:// in production (or set ALLOW_INSECURE_APP_URL=true)",
      });
    }
    // Without a trusted proxy, X-Forwarded-For is client-controlled and the
    // per-IP rate limit can be bypassed.
    if (
      data.NODE_ENV === "production" &&
      !isBuild &&
      data.ALLOW_NO_TRUSTED_PROXY !== "true" &&
      !data.TRUSTED_PROXY?.trim()
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["TRUSTED_PROXY"],
        message: "TRUSTED_PROXY is required in production (or set ALLOW_NO_TRUSTED_PROXY=true)",
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export function parseEnv(raw: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

export const env = parseEnv(process.env);
