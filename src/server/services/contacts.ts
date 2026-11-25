import { and, asc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { clientContact } from "@/server/db/schema";
import type { ContactInput } from "@/lib/validation/referential";
import { logAudit } from "./audit";
import { getClient } from "./clients";
import { DomainError } from "./errors";

export async function listContacts(userId: string, clientId?: string) {
  const conditions = clientId
    ? and(eq(clientContact.userId, userId), eq(clientContact.clientId, clientId))
    : eq(clientContact.userId, userId);
  return db.select().from(clientContact).where(conditions).orderBy(asc(clientContact.name));
}

async function getOwnedContact(userId: string, contactId: string) {
  const rows = await db
    .select()
    .from(clientContact)
    .where(and(eq(clientContact.id, contactId), eq(clientContact.userId, userId)))
    .limit(1);
  const row = rows[0];
  if (!row) {
    throw new DomainError("NOT_FOUND", "Contact not found");
  }
  return row;
}

export async function createContact(userId: string, clientId: string, input: ContactInput) {
  // IDOR guard: the parent client must belong to the user.
  await getClient(userId, clientId);
  const rows = await db
    .insert(clientContact)
    .values({ userId, clientId, ...input })
    .returning();
  const created = rows[0];
  await logAudit({
    userId,
    actor: "user",
    action: "contact.create",
    entity: "client_contact",
    entityId: created?.id,
  });
  return created;
}

export async function updateContact(userId: string, contactId: string, input: ContactInput) {
  await getOwnedContact(userId, contactId);
  const rows = await db
    .update(clientContact)
    .set(input)
    .where(and(eq(clientContact.id, contactId), eq(clientContact.userId, userId)))
    .returning();
  await logAudit({
    userId,
    actor: "user",
    action: "contact.update",
    entity: "client_contact",
    entityId: contactId,
  });
  return rows[0];
}

export async function deleteContact(userId: string, contactId: string) {
  await getOwnedContact(userId, contactId);
  await db
    .delete(clientContact)
    .where(and(eq(clientContact.id, contactId), eq(clientContact.userId, userId)));
  await logAudit({
    userId,
    actor: "user",
    action: "contact.delete",
    entity: "client_contact",
    entityId: contactId,
  });
}
