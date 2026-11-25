import { describe, expect, it } from "vitest";
import { isCompromisedPassword, passwordSchema } from "@/lib/validation/password";

describe("isCompromisedPassword", () => {
  it("flags common passwords regardless of case", () => {
    expect(isCompromisedPassword("password")).toBe(true);
    expect(isCompromisedPassword("PASSWORD")).toBe(true);
    expect(isCompromisedPassword("Azerty123")).toBe(true);
  });

  it("flags repeated-character and keyboard-sequence passwords", () => {
    expect(isCompromisedPassword("aaaaaaaaaaaa")).toBe(true);
    expect(isCompromisedPassword("123456789012")).toBe(true);
    expect(isCompromisedPassword("qwertyuiopas")).toBe(true);
  });

  it("accepts strong passphrases", () => {
    expect(isCompromisedPassword("Correct-Horse-Battery-9!")).toBe(false);
  });
});

describe("passwordSchema", () => {
  it("rejects passwords shorter than 12 characters", () => {
    expect(passwordSchema.safeParse("Court-9!").success).toBe(false);
  });

  it("rejects compromised passwords", () => {
    expect(passwordSchema.safeParse("123456789012").success).toBe(false);
  });

  it("accepts a strong passphrase", () => {
    expect(passwordSchema.safeParse("Correct-Horse-Battery-9!").success).toBe(true);
  });
});
