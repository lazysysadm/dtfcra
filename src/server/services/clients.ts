import { and, asc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { client, mission } from "@/server/db/schema";
import type { ClientInput } from "@/lib/validation/referential";
import { logAudit } from "./audit";
import { DomainError } from "./errors";

export async function listClients(userId: string) {
  return db.select().from(client).where(eq(client.userId, userId)).orderBy(asc(client.legalName));
}

export async function getClient(userId: string, clientId: string) {
  const rows = await db
    .select()
    .from(client)
    .where(and(eq(client.id, clientId), eq(client.userId, userId)))
    .limit(1);
  const row = rows[0];
  if (!row) {
    throw new DomainError("NOT_FOUND", "Client not found");
  }
  return row;
}

export async function createClient(userId: string, input: ClientInput) {
  const rows = await db
    .insert(client)
    .values({ userId, ...input })
    .returning();
  const created = rows[0];
  await logAudit({
    userId,
    actor: "user",
    action: "client.create",
    entity: "client",
    entityId: created?.id,
  });
  return created;
}

export async function updateClient(userId: string, clientId: string, input: ClientInput) {
  await getClient(userId, clientId);
  const rows = await db
    .update(client)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(client.id, clientId), eq(client.userId, userId)))
    .returning();
  await logAudit({
    userId,
    actor: "user",
    action: "client.update",
    entity: "client",
    entityId: clientId,
  });
  return rows[0];
}

export async function deleteClient(userId: string, clientId: string) {
  await getClient(userId, clientId);
  const missions = await db
    .select({ id: mission.id })
    .from(mission)
    .where(and(eq(mission.clientId, clientId), eq(mission.userId, userId)))
    .limit(1);
  if (missions.length > 0) {
    throw new DomainError("CONFLICT", "Client has missions");
  }
  await db.delete(client).where(and(eq(client.id, clientId), eq(client.userId, userId)));
  await logAudit({
    userId,
    actor: "user",
    action: "client.delete",
    entity: "client",
    entityId: clientId,
  });
}
