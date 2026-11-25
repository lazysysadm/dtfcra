import { describe, expect, it } from "vitest";
import { uuidv7 } from "@/lib/uuid";

const UUID_V7_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("uuidv7", () => {
  it("produces RFC 9562 version 7 UUIDs", () => {
    for (let i = 0; i < 50; i += 1) {
      expect(uuidv7()).toMatch(UUID_V7_REGEX);
    }
  });

  it("produces unique values", () => {
    const values = new Set(Array.from({ length: 500 }, () => uuidv7()));
    expect(values.size).toBe(500);
  });

  it("embeds a millisecond timestamp close to now", () => {
    const value = uuidv7();
    const hex = value.replace(/-/g, "").slice(0, 12);
    const timestamp = Number(BigInt(`0x${hex}`));
    expect(Math.abs(Date.now() - timestamp)).toBeLessThan(5000);
  });
});
