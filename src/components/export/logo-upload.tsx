"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LogoUpload({ hasLogo }: { hasLogo: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setError(null);
    setSuccess(false);
    setPending(true);
    const response = await fetch("/api/profile/logo", {
      method: "POST",
      body: new FormData(formElement),
    });
    setPending(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Téléversement impossible.");
      return;
    }
    formElement.reset();
    setSuccess(true);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Logo</CardTitle>
        <CardDescription>PNG ou JPEG, 2 Mo max. Affiché sur les exports PDF.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/api/profile/logo" alt="Logo du freelance" className="h-16 w-auto" />
        ) : null}
        <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="logo">Fichier</Label>
            <Input id="logo" name="logo" type="file" accept="image/png,image/jpeg" required />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Envoi…" : "Téléverser le logo"}
          </Button>
        </form>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {success ? <p className="text-sm text-green-700">Logo enregistré.</p> : null}
      </CardContent>
    </Card>
  );
}
