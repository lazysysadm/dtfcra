import { desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { auditLog } from "@/server/db/schema";

export type AuditActor = "user" | "system";

export interface AuditEntry {
  userId?: string | null;
  actor: AuditActor;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
}

// Minimal executor shape so logAudit can run inside or outside a transaction.
type Executor = Pick<typeof db, "insert">;

// Append-only: this module exposes insert and scoped read, nothing else.
// Pass `tx` to write the audit row in the same transaction as the mutation.
export async function logAudit(entry: AuditEntry, tx: Executor = db): Promise<void> {
  await tx.insert(auditLog).values({
    userId: entry.userId ?? null,
    actor: entry.actor,
    action: entry.action,
    entity: entry.entity ?? null,
    entityId: entry.entityId ?? null,
    metadata: entry.metadata ?? null,
    ip: entry.ip ?? null,
  });
}

// Tenant isolation: always filtered by userId.
export async function listAuditLogs(userId: string, limit = 50) {
  return db
    .select()
    .from(auditLog)
    .where(eq(auditLog.userId, userId))
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);
}
