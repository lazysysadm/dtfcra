"use client";

import { useState } from "react";
import { authClient } from "@/server/auth/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export interface SessionItem {
  token: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date | string;
}

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" });

export function SessionList({
  initialSessions,
  currentToken,
}: {
  initialSessions: SessionItem[];
  currentToken: string;
}) {
  const [sessions, setSessions] = useState<SessionItem[]>(initialSessions);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const { data } = await authClient.listSessions();
    if (data) {
      setSessions(data);
    }
  }

  async function onRevoke(token: string) {
    setError(null);
    const { error: revokeError } = await authClient.revokeSession({ token });
    if (revokeError) {
      setError("Révocation impossible.");
      return;
    }
    await refresh();
  }

  async function onRevokeOthers() {
    setError(null);
    const { error: revokeError } = await authClient.revokeOtherSessions();
    if (revokeError) {
      setError("Révocation impossible.");
      return;
    }
    await refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appareils connectés</CardTitle>
        <CardDescription>Révoquez les sessions que vous ne reconnaissez pas.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {sessions.map((session) => (
            <li key={session.token} className="flex items-center justify-between gap-2 text-sm">
              <div>
                <p className="font-medium">
                  {session.token === currentToken ? "Session actuelle" : "Autre session"}
                </p>
                <p className="text-muted-foreground">
                  {session.userAgent ?? "Appareil inconnu"} — {session.ipAddress ?? "IP inconnue"} —{" "}
                  {dateFormat.format(new Date(session.createdAt))}
                </p>
              </div>
              {session.token !== currentToken ? (
                <Button variant="outline" size="sm" onClick={() => onRevoke(session.token)}>
                  Révoquer
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
        <Button variant="destructive" size="sm" onClick={onRevokeOthers}>
          Révoquer toutes les autres sessions
        </Button>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
