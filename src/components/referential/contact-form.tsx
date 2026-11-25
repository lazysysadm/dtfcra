"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createContactAction, updateContactAction } from "@/server/actions/referential";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ContactInitial {
  id: string;
  name: string;
  email: string;
  role: string | null;
}

export function ContactForm({ clientId, initial }: { clientId: string; initial?: ContactInitial }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const input = {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      role: String(form.get("role") ?? ""),
    };
    setPending(true);
    const result = initial
      ? await updateContactAction(clientId, initial.id, input)
      : await createContactAction(clientId, input);
    setPending(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    if (!initial) {
      formElement.reset();
    }
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor={`name-${initial?.id ?? "new"}`}>Nom *</Label>
          <Input
            id={`name-${initial?.id ?? "new"}`}
            name="name"
            required
            maxLength={200}
            defaultValue={initial?.name ?? ""}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`email-${initial?.id ?? "new"}`}>Email *</Label>
          <Input
            id={`email-${initial?.id ?? "new"}`}
            name="email"
            type="email"
            required
            defaultValue={initial?.email ?? ""}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`role-${initial?.id ?? "new"}`}>Rôle</Label>
          <Input
            id={`role-${initial?.id ?? "new"}`}
            name="role"
            maxLength={100}
            placeholder="Chef de projet, DAF…"
            defaultValue={initial?.role ?? ""}
          />
        </div>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Enregistrement…" : initial ? "Mettre à jour" : "Ajouter le contact"}
      </Button>
    </form>
  );
}
