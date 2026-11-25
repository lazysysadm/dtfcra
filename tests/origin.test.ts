import { describe, expect, it } from "vitest";
import { assertOrigin } from "@/server/auth/helpers";
import { DomainError } from "@/server/services/errors";

function requestWithOrigin(origin?: string): Request {
  return new Request("http://127.0.0.1:3000/api/example", {
    method: "POST",
    headers: origin ? { origin } : {},
  });
}

describe("assertOrigin", () => {
  it("accepts the app origin", () => {
    expect(() => assertOrigin(requestWithOrigin("http://127.0.0.1:3000"))).not.toThrow();
  });

  it("accepts requests without Origin (non-browser clients)", () => {
    expect(() => assertOrigin(requestWithOrigin())).not.toThrow();
  });

  it("rejects a foreign origin", () => {
    expect(() => assertOrigin(requestWithOrigin("https://evil.example"))).toThrow(DomainError);
    try {
      assertOrigin(requestWithOrigin("https://evil.example"));
    } catch (error) {
      expect((error as DomainError).code).toBe("FORBIDDEN");
    }
  });

  it("rejects a cross-site request without Origin (Sec-Fetch-Site)", () => {
    const request = new Request("http://127.0.0.1:3000/api/example", {
      method: "POST",
      headers: { "sec-fetch-site": "cross-site" },
    });
    expect(() => assertOrigin(request)).toThrow(DomainError);
  });

  it("accepts a same-origin request without Origin", () => {
    const request = new Request("http://127.0.0.1:3000/api/example", {
      method: "POST",
      headers: { "sec-fetch-site": "same-origin" },
    });
    expect(() => assertOrigin(request)).not.toThrow();
  });
});
