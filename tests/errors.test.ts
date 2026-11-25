import { describe, expect, it } from "vitest";
import { DomainError } from "@/server/services/errors";
import { canSignUp } from "@/server/auth/signup-policy";

describe("DomainError", () => {
  it("carries a stable code and name", () => {
    const error = new DomainError("UNAUTHORIZED", "Authentication required");
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("DomainError");
    expect(error.code).toBe("UNAUTHORIZED");
    expect(error.message).toBe("Authentication required");
  });
});

describe("canSignUp", () => {
  it("always allows the very first account", () => {
    expect(canSignUp(0, false)).toBe(true);
  });

  it("blocks subsequent signups when ALLOW_SIGNUP is false", () => {
    expect(canSignUp(1, false)).toBe(false);
    expect(canSignUp(42, false)).toBe(false);
  });

  it("allows signups when ALLOW_SIGNUP is true", () => {
    expect(canSignUp(42, true)).toBe(true);
  });
});
