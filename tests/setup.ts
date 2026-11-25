import { vi } from "vitest";

// NODE_ENV is read-only in @types/node — vi.stubEnv is the supported way.
vi.stubEnv("NODE_ENV", "test");
// Keep real values when provided (dev container / CI database); fall back to
// dummy values for pure unit tests.
process.env.DATABASE_URL ??= "postgresql://test:test@127.0.0.1:5432/test";
process.env.BETTER_AUTH_SECRET ??= "test-secret-0123456789abcdef0123456789abcdef";
process.env.APP_URL ??= "http://127.0.0.1:3000";
process.env.ALLOW_SIGNUP ??= "true";
