import { headers } from "next/headers";
import { auth } from "@/server/auth";
import { requireUser } from "@/server/auth/helpers";
import { listAuditLogs } from "@/server/services/audit";
import { ChangePasswordForm } from "@/components/security/change-password-form";
import { PasskeyManager } from "@/components/security/passkey-manager";
import { SessionList } from "@/components/security/session-list";
import { TwoFactorSetup } from "@/components/security/two-factor-setup";
import { Card, CardContent } from "@/components/ui/card";

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "medium" });

export default async function SecurityPage() {
  const session = await requireUser();
  const requestHeaders = await headers();
  const [passkeys, sessions, audit] = await Promise.all([
    auth.api.listPasskeys({ headers: requestHeaders }),
    auth.api.listSessions({ headers: requestHeaders }),
    listAuditLogs(session.user.id, 20),
  ]);
  const twoFactorEnabled = Boolean(
    (session.user as { twoFactorEnabled?: boolean }).twoFactorEnabled,
  );
  const lastLogin = sessions.reduce<Date | null>((latest, item) => {
    const created = new Date(item.createdAt);
    return !latest || created > latest ? created : latest;
  }, null);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Sécurité du compte</h1>
        <p className="text-sm text-muted-foreground">Connecté : {session.user.email}</p>
        {lastLogin ? (
          <p className="text-sm text-muted-foreground">
            Dernière connexion : {dateFormat.format(lastLogin)}
          </p>
        ) : null}
      </div>
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Mot de passe</h2>
        <ChangePasswordForm />
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Vérification en deux étapes (TOTP)</h2>
        <TwoFactorSetup enabled={twoFactorEnabled} />
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Passkeys (WebAuthn)</h2>
        <PasskeyManager initialPasskeys={passkeys} />
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Sessions actives</h2>
        <SessionList initialSessions={sessions} currentToken={session.session.token} />
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Journal d&apos;activité</h2>
        <Card>
          <CardContent>
            {audit.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune activité enregistrée.</p>
            ) : (
              <ul className="divide-y text-sm">
                {audit.map((entry) => (
                  <li key={entry.id} className="flex flex-wrap justify-between gap-2 py-2">
                    <span className="font-mono">{entry.action}</span>
                    <span className="text-muted-foreground">
                      {dateFormat.format(new Date(entry.createdAt))}
                      {entry.ip ? ` · ${entry.ip}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
