import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";
import { auth } from "@/server/auth";
import { db, pool } from "@/server/db";
import * as schema from "@/server/db/schema";
import {
  createClient,
  deleteClient,
  getClient,
  listClients,
  updateClient,
} from "@/server/services/clients";
import { createContact, listContacts } from "@/server/services/contacts";
import { createMission, getMission, listMissions } from "@/server/services/missions";
import { getProfile, upsertProfile } from "@/server/services/profile";
import type { MissionInput } from "@/lib/validation/referential";

// Integration tests — real PostgreSQL, two users, strict tenant isolation.
const PASSWORD = "Correct-Horse-Battery-9!";
const EMAIL_A = "referentiel-a@test.local";
const EMAIL_B = "referentiel-b@test.local";

let userAId = "";
let userBId = "";
let clientAId = "";
let contactAId = "";
let missionAId = "";

function missionInput(clientId: string, overrides: Partial<MissionInput> = {}): MissionInput {
  return {
    clientId,
    title: "Mission régie",
    startDate: "2026-01-01",
    endDate: null,
    tjmCents: 55000,
    unit: "day",
    hoursPerDay: 7,
    holidayTerritory: "metropole",
    status: "active",
    ...overrides,
  };
}

beforeAll(async () => {
  await db.delete(schema.user).where(inArray(schema.user.email, [EMAIL_A, EMAIL_B]));
  await db.delete(schema.rateLimit);
  await db.delete(schema.publicRateLimit);
  const a = await auth.api.signUpEmail({
    body: { name: "Alice", email: EMAIL_A, password: PASSWORD },
  });
  const b = await auth.api.signUpEmail({
    body: { name: "Bob", email: EMAIL_B, password: PASSWORD },
  });
  userAId = a.user.id;
  userBId = b.user.id;

  await upsertProfile(userAId, {
    legalName: "Alice Consulting",
    consultantName: "Alice Martin",
    legalForm: "SASU",
    siret: "12345678901234",
    address: null,
    vatNumber: null,
    brandColor: "#0f172a",
    holidayTerritory: "metropole",
  });
  const clientA = await createClient(userAId, {
    legalName: "Client A",
    siret: null,
    address: null,
    notes: null,
  });
  clientAId = clientA!.id;
  const contactA = await createContact(userAId, clientAId, {
    name: "Contact A",
    email: "contact@client-a.test",
    role: "DAF",
  });
  contactAId = contactA!.id;
  const missionA = await createMission(userAId, missionInput(clientAId));
  missionAId = missionA!.id;
});

afterAll(async () => {
  await db.delete(schema.mission).where(inArray(schema.mission.userId, [userAId, userBId]));
  await db
    .delete(schema.clientContact)
    .where(inArray(schema.clientContact.userId, [userAId, userBId]));
  await db.delete(schema.client).where(inArray(schema.client.userId, [userAId, userBId]));
  await db
    .delete(schema.freelancerProfile)
    .where(inArray(schema.freelancerProfile.userId, [userAId, userBId]));
  await db.delete(schema.auditLog).where(inArray(schema.auditLog.userId, [userAId, userBId]));
  await db.delete(schema.user).where(inArray(schema.user.email, [EMAIL_A, EMAIL_B]));
  await pool.end();
});

describe("referential CRUD (integration)", () => {
  it("upserts the profile idempotently", async () => {
    const first = await getProfile(userAId);
    await upsertProfile(userAId, {
      legalName: "Alice Consulting Updated",
      consultantName: "Alice Martin",
      legalForm: "SASU",
      siret: null,
      address: null,
      vatNumber: null,
      brandColor: "#123456",
      holidayTerritory: "alsace-moselle",
    });
    const second = await getProfile(userAId);
    expect(second?.id).toBe(first?.id);
    expect(second?.legalName).toBe("Alice Consulting Updated");
    expect(second?.holidayTerritory).toBe("alsace-moselle");
  });

  it("lists and reads owned entities", async () => {
    expect((await listClients(userAId)).map((c) => c.id)).toContain(clientAId);
    expect((await listContacts(userAId, clientAId)).map((c) => c.id)).toContain(contactAId);
    expect((await listMissions(userAId)).map((m) => m.id)).toContain(missionAId);
    expect((await getMission(userAId, missionAId)).title).toBe("Mission régie");
  });

  it("blocks deleting a client that has missions", async () => {
    await expect(deleteClient(userAId, clientAId)).rejects.toMatchObject({ code: "CONFLICT" });
  });
});

describe("tenant isolation (IDOR)", () => {
  it("user B cannot read, update or delete user A's client", async () => {
    await expect(getClient(userBId, clientAId)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      updateClient(userBId, clientAId, {
        legalName: "Piraté",
        siret: null,
        address: null,
        notes: null,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(deleteClient(userBId, clientAId)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await listClients(userBId)).toHaveLength(0);
  });

  it("user B cannot attach a contact or mission to user A's client", async () => {
    await expect(
      createContact(userBId, clientAId, {
        name: "Pirate",
        email: "pirate@evil.test",
        role: null,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(createMission(userBId, missionInput(clientAId))).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("user B cannot read user A's mission or profile", async () => {
    await expect(getMission(userBId, missionAId)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await listMissions(userBId)).toHaveLength(0);
    expect(await getProfile(userBId)).toBeNull();
  });
});
