import { describe, expect, it } from "vitest";
import {
  clientSchema,
  contactSchema,
  missionSchema,
  profileSchema,
} from "@/lib/validation/referential";

const validMission = {
  clientId: "01a20e24-90cc-74f6-a6a8-5c3925630f36",
  title: "Mission test",
  startDate: "2026-01-01",
  endDate: "2026-06-30",
  tjmCents: 50000,
  unit: "day",
  hoursPerDay: 7,
  holidayTerritory: "metropole",
  status: "active",
};

describe("missionSchema", () => {
  it("accepts a valid mission", () => {
    expect(missionSchema.safeParse(validMission).success).toBe(true);
  });

  it("rejects an end date before the start date", () => {
    const result = missionSchema.safeParse({ ...validMission, endDate: "2025-12-31" });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown territory", () => {
    expect(
      missionSchema.safeParse({ ...validMission, holidayTerritory: "atlantide" }).success,
    ).toBe(false);
  });
});

describe("clientSchema", () => {
  it("requires a legal name", () => {
    expect(clientSchema.safeParse({ legalName: "" }).success).toBe(false);
  });

  it("normalizes empty optional fields to null", () => {
    const result = clientSchema.parse({ legalName: "ACME", siret: "", address: "  " });
    expect(result.siret).toBeNull();
    expect(result.address).toBeNull();
  });

  it("rejects a SIRET that is not 14 digits", () => {
    expect(clientSchema.safeParse({ legalName: "ACME", siret: "12345" }).success).toBe(false);
    expect(clientSchema.safeParse({ legalName: "ACME", siret: "12345678901234" }).success).toBe(
      true,
    );
  });
});

describe("contactSchema", () => {
  it("rejects an invalid email", () => {
    expect(contactSchema.safeParse({ name: "Jean", email: "pas-un-email" }).success).toBe(false);
  });

  it("accepts a contact without role and normalizes empty role to null", () => {
    const result = contactSchema.parse({ name: "Jean", email: "jean@example.com", role: "" });
    expect(result.role).toBeNull();
  });
});

describe("profileSchema", () => {
  it("rejects an invalid brand color", () => {
    expect(
      profileSchema.safeParse({
        legalName: "Moi",
        consultantName: "Jean Dupont",
        brandColor: "rouge",
        holidayTerritory: "metropole",
      }).success,
    ).toBe(false);
  });

  it("rejects an invalid VAT number", () => {
    expect(
      profileSchema.safeParse({
        legalName: "Moi",
        consultantName: "Jean Dupont",
        brandColor: "#0f172a",
        holidayTerritory: "metropole",
        vatNumber: "DE123456789",
      }).success,
    ).toBe(false);
  });

  it("accepts a valid profile", () => {
    expect(
      profileSchema.safeParse({
        legalName: "Moi",
        consultantName: "Jean Dupont",
        brandColor: "#0f172a",
        holidayTerritory: "alsace-moselle",
        siret: "12345678901234",
        vatNumber: "FR12345678901",
      }).success,
    ).toBe(true);
  });
});
