"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClientAction, updateClientAction } from "@/server/actions/referential";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface ClientInitial {
  id: string;
  legalName: string;
  siret: string | null;
  address: string | null;
  notes: string | null;
}

export function ClientForm({ initial }: { initial?: ClientInitial }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const input = {
      legalName: String(form.get("legalName") ?? ""),
      siret: String(form.get("siret") ?? ""),
      address: String(form.get("address") ?? ""),
      notes: String(form.get("notes") ?? ""),
    };
    setPending(true);
    const result = initial
      ? await updateClientAction(initial.id, input)
      : await createClientAction(input);
    setPending(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    if (!initial) {
      formElement.reset();
    }
    setSuccess(true);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initial ? "Modifier le client" : "Nouveau client"}</CardTitle>
        <CardDescription>
          {initial
            ? "Mettez à jour les informations du client."
            : "Ajoutez un client à votre référentiel."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="legalName">Raison sociale *</Label>
              <Input
                id="legalName"
                name="legalName"
                required
                maxLength={200}
                defaultValue={initial?.legalName ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="siret">SIRET (14 chiffres)</Label>
              <Input id="siret" name="siret" maxLength={14} defaultValue={initial?.siret ?? ""} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Adresse</Label>
            <Textarea
              id="address"
              name="address"
              maxLength={500}
              defaultValue={initial?.address ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              maxLength={5000}
              defaultValue={initial?.notes ?? ""}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {success ? <p className="text-sm text-green-700">Client enregistré.</p> : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Enregistrement…" : initial ? "Mettre à jour" : "Créer le client"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
