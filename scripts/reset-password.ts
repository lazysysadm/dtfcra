// Host-side password reset (no email is ever sent by dtfcra).
// Usage: pnpm auth:reset-password <email> <nouveau-mot-de-passe>
import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";
import { db, pool } from "../src/server/db";
import * as schema from "../src/server/db/schema";
import { isCompromisedPassword } from "../src/lib/validation/password";
import { logAudit } from "../src/server/services/audit";
import { resetLoginFailures } from "../src/server/services/lockout";

async function main() {
  const [email, newPassword] = process.argv.slice(2);
  if (!email || !newPassword) {
    console.error("Usage: pnpm auth:reset-password <email> <nouveau-mot-de-passe>");
    process.exit(1);
  }
  if (newPassword.length < 12 || newPassword.length > 128 || isCompromisedPassword(newPassword)) {
    console.error("Mot de passe refusé : 12 à 128 caractères, non compromis.");
    process.exit(1);
  }

  const users = await db
    .select()
    .from(schema.user)
    .where(eq(schema.user.email, email.toLowerCase()))
    .limit(1);
  const user = users[0];
  if (!user) {
    console.error("Utilisateur introuvable.");
    process.exit(1);
  }

  const hash = await hashPassword(newPassword);
  const updated = await db
    .update(schema.account)
    .set({ password: hash })
    .where(and(eq(schema.account.userId, user.id), eq(schema.account.providerId, "credential")))
    .returning({ id: schema.account.id });
  if (updated.length === 0) {
    console.error("Aucun compte mot de passe pour cet utilisateur.");
    process.exit(1);
  }

  // Revoke every session after a host-side reset, and clear any sign-in lockout
  // (the host-side reset is the documented bypass for a locked account).
  await db.delete(schema.session).where(eq(schema.session.userId, user.id));
  await resetLoginFailures(email.toLowerCase());
  await logAudit({
    userId: user.id,
    actor: "system",
    action: "auth.password_reset_cli",
    entity: "user",
    entityId: user.id,
  });
  await pool.end();
  console.log("Mot de passe réinitialisé ; toutes les sessions ont été révoquées.");
}

main().catch((error: unknown) => {
  console.error("Échec de la réinitialisation :", error);
  process.exit(1);
});
