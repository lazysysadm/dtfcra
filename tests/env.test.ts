import { describe, expect, it } from "vitest";
import { parseEnv } from "@/env";

const valid = {
  DATABASE_URL: "postgresql://user:pass@127.0.0.1:5432/db",
  BETTER_AUTH_SECRET: "a".repeat(64),
};

describe("parseEnv", () => {
  it("accepts a valid environment and applies defaults", () => {
    const env = parseEnv(valid);
    expect(env.NODE_ENV).toBe("development");
    expect(env.APP_URL).toBe("http://127.0.0.1:3000");
    expect(env.LOG_LEVEL).toBe("info");
  });

  it("rejects a missing DATABASE_URL", () => {
    expect(() => parseEnv({ BETTER_AUTH_SECRET: "a".repeat(64) })).toThrow(/DATABASE_URL/);
  });

  it("rejects a non-PostgreSQL DATABASE_URL", () => {
    expect(() => parseEnv({ ...valid, DATABASE_URL: "mysql://user:pass@host/db" })).toThrow(
      /DATABASE_URL/,
    );
  });

  it("rejects a BETTER_AUTH_SECRET shorter than 32 chars", () => {
    expect(() => parseEnv({ ...valid, BETTER_AUTH_SECRET: "short" })).toThrow(/BETTER_AUTH_SECRET/);
  });

  it("rejects an invalid NODE_ENV", () => {
    expect(() => parseEnv({ ...valid, NODE_ENV: "staging" })).toThrow(/NODE_ENV/);
  });

  it("requires TRUSTED_PROXY and https APP_URL in production", () => {
    const prod = { ...valid, NODE_ENV: "production", APP_URL: "https://cra.example" };
    expect(() => parseEnv(prod)).toThrow(/TRUSTED_PROXY/);
    expect(() => parseEnv({ ...prod, TRUSTED_PROXY: "10.0.0.1" })).not.toThrow();
    expect(() => parseEnv({ ...prod, ALLOW_NO_TRUSTED_PROXY: "true" })).not.toThrow();
  });
});
