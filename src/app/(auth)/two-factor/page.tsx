"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/server/auth/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function TwoFactorPage() {
  const router = useRouter();
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    const code = String(form.get("code") ?? "").trim();
    const { error: verifyError } = useBackupCode
      ? await authClient.twoFactor.verifyBackupCode({ code })
      : await authClient.twoFactor.verifyTotp({ code });
    setPending(false);
    if (verifyError) {
      setError("Code invalide ou expiré. Veuillez réessayer.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vérification en deux étapes</CardTitle>
        <CardDescription>
          {useBackupCode
            ? "Saisissez un code de secours."
            : "Saisissez le code à 6 chiffres de votre application d'authentification."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">{useBackupCode ? "Code de secours" : "Code TOTP"}</Label>
            <Input
              id="code"
              name="code"
              required
              autoComplete="one-time-code"
              inputMode={useBackupCode ? "text" : "numeric"}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Vérification…" : "Vérifier"}
          </Button>
          <Button
            type="button"
            variant="link"
            className="w-full"
            onClick={() => {
              setUseBackupCode((value) => !value);
              setError(null);
            }}
          >
            {useBackupCode ? "Utiliser le code TOTP" : "Utiliser un code de secours"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
