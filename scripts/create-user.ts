// Hoster-side account creation — bypasses the signup gate (audited).
// Usage: pnpm auth:create-user <email> <name> [password]
// Without a password argument, a strong one is generated and printed once.
import { randomBytes } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { db, pool } from "../src/server/db";
import * as schema from "../src/server/db/schema";
import { passwordSchema } from "../src/lib/validation/password";
import { uuidv7 } from "../src/lib/uuid";
import { logAudit } from "../src/server/services/audit";

async function main() {
  const [emailArg, name, passwordArg] = process.argv.slice(2);
  if (!emailArg || !name) {
    console.error("Usage: pnpm auth:create-user <email> <name> [password]");
    process.exit(1);
  }
  const email = emailArg.toLowerCase();
  const password = passwordArg ?? `Dtfcra-${randomBytes(9).toString("base64url")}-Test!`;
  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) {
    console.error(parsed.error.issues[0]?.message ?? "Mot de passe invalide.");
    process.exit(1);
  }

  const existing = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.email, email))
    .limit(1);
  if (existing.length > 0) {
    console.error("Un compte existe déjà avec cet email.");
    process.exit(1);
  }

  const userId = uuidv7();
  const hash = await hashPassword(password);
  await db.insert(schema.user).values({ id: userId, name, email, emailVerified: false });
  await db.insert(schema.account).values({
    id: uuidv7(),
    userId,
    accountId: userId,
    providerId: "credential",
    password: hash,
  });
  await logAudit({
    userId,
    actor: "system",
    action: "auth.user_created_cli",
    entity: "user",
    entityId: userId,
  });
  await pool.end();
  console.log(`Compte créé : ${email}`);
  if (!passwordArg) {
    console.log(`Mot de passe généré (changez-le après connexion) : ${password}`);
  }
}

main().catch((error: unknown) => {
  console.error("Échec de la création du compte :", error);
  process.exit(1);
});
