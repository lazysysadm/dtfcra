"use client";

import { useState, type FormEvent } from "react";
import { authClient } from "@/server/auth/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface PasskeyItem {
  id: string;
  name?: string | null;
  createdAt?: Date | string | null;
}

export function PasskeyManager({ initialPasskeys }: { initialPasskeys: PasskeyItem[] }) {
  const [passkeys, setPasskeys] = useState<PasskeyItem[]>(initialPasskeys);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function refresh() {
    const { data } = await authClient.passkey.listUserPasskeys();
    if (data) {
      setPasskeys(data);
    }
  }

  async function onAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const { error: addError } = await authClient.passkey.addPasskey({
      name: String(form.get("name") ?? "") || undefined,
    });
    setPending(false);
    if (addError) {
      setError(
        "Ajout impossible : contexte non sécurisé (utilisez localhost ou HTTPS) ou opération annulée.",
      );
      return;
    }
    formElement.reset();
    await refresh();
  }

  async function onDelete(id: string) {
    setError(null);
    const { error: deleteError } = await authClient.passkey.deletePasskey({ id });
    if (deleteError) {
      setError("Suppression impossible.");
      return;
    }
    await refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vos passkeys</CardTitle>
        <CardDescription>
          Connectez-vous sans mot de passe avec votre appareil (WebAuthn). Nécessite localhost ou
          HTTPS.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {passkeys.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune passkey enregistrée.</p>
        ) : (
          <ul className="space-y-2">
            {passkeys.map((passkey) => (
              <li key={passkey.id} className="flex items-center justify-between gap-2 text-sm">
                <span>{passkey.name || "Passkey sans nom"}</span>
                <Button variant="destructive" size="sm" onClick={() => onDelete(passkey.id)}>
                  Supprimer
                </Button>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={onAdd} className="flex items-end gap-2">
          <div className="flex-1 space-y-2">
            <Label htmlFor="passkey-name">Nom (optionnel)</Label>
            <Input id="passkey-name" name="name" placeholder="Clé USB, téléphone…" />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Enregistrement…" : "Ajouter une passkey"}
          </Button>
        </form>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
