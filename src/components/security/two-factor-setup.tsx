"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { authClient } from "@/server/auth/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Step = "idle" | "verify" | "done";

export function TwoFactorSetup({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("idle");
  const [totpURI, setTotpURI] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onEnable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    const { data, error: enableError } = await authClient.twoFactor.enable({
      password: String(form.get("password") ?? ""),
    });
    setPending(false);
    if (enableError || !data) {
      setError("Mot de passe invalide ou activation impossible.");
      return;
    }
    // Better Auth 1.7 : union { method: "otp" } | { method: "totp", totpURI, backupCodes }.
    if (data.method !== "totp") {
      setError("Méthode d'activation non supportée (TOTP attendu).");
      return;
    }
    setTotpURI(data.totpURI);
    setBackupCodes(data.backupCodes);
    setStep("verify");
  }

  async function onVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    const { error: verifyError } = await authClient.twoFactor.verifyTotp({
      code: String(form.get("code") ?? "").trim(),
    });
    if (verifyError) {
      setPending(false);
      setError("Code invalide. Vérifiez l'heure de votre appareil et réessayez.");
      return;
    }
    // Session rotation after 2FA activation.
    await authClient.revokeOtherSessions();
    setPending(false);
    setStep("done");
    router.refresh();
  }

  async function onDisable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    const { error: disableError } = await authClient.twoFactor.disable({
      password: String(form.get("password") ?? ""),
    });
    setPending(false);
    if (disableError) {
      setError("Désactivation impossible : mot de passe invalide.");
      return;
    }
    router.refresh();
  }

  async function onRegenerateCodes(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    const { data, error: regenError } = await authClient.twoFactor.generateBackupCodes({
      password: String(form.get("password") ?? ""),
    });
    setPending(false);
    if (regenError || !data) {
      setError("Régénération impossible : mot de passe invalide.");
      return;
    }
    setBackupCodes(data.backupCodes);
    setStep("done");
  }

  if (step === "done" && backupCodes.length > 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Codes de secours</CardTitle>
          <CardDescription>
            Conservez ces codes en lieu sûr : chacun ne sert qu&apos;une fois. Ils ne seront plus
            affichés.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="grid grid-cols-2 gap-1 font-mono text-sm">
            {backupCodes.map((code) => (
              <li key={code}>{code}</li>
            ))}
          </ul>
          <Button variant="outline" onClick={() => setStep("idle")}>
            Fermer
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (step === "verify" && totpURI) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scannez le QR code</CardTitle>
          <CardDescription>
            Ajoutez le compte « dtfcra » dans votre application d&apos;authentification, puis
            saisissez le code affiché pour activer la vérification en deux étapes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center rounded-md bg-white p-4">
            <QRCodeSVG value={totpURI} size={192} />
          </div>
          <form onSubmit={onVerify} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="totp-code">Code à 6 chiffres</Label>
              <Input id="totp-code" name="code" required inputMode="numeric" maxLength={6} />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" disabled={pending}>
              {pending ? "Vérification…" : "Activer"}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  if (enabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>2FA activée</CardTitle>
          <CardDescription>
            La vérification en deux étapes protège votre compte. Les autres sessions ont été
            révoquées à l&apos;activation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={onRegenerateCodes} className="flex items-end gap-2">
            <div className="flex-1 space-y-2">
              <Label htmlFor="regen-password">Mot de passe</Label>
              <Input
                id="regen-password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" variant="outline" disabled={pending}>
              Régénérer les codes de secours
            </Button>
          </form>
          <form onSubmit={onDisable} className="flex items-end gap-2">
            <div className="flex-1 space-y-2">
              <Label htmlFor="disable-password">Mot de passe</Label>
              <Input
                id="disable-password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" variant="destructive" disabled={pending}>
              Désactiver la 2FA
            </Button>
          </form>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>2FA non activée</CardTitle>
        <CardDescription>
          Protégez votre compte avec un code TOTP (application d&apos;authentification).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onEnable} className="flex items-end gap-2">
          <div className="flex-1 space-y-2">
            <Label htmlFor="enable-password">Mot de passe</Label>
            <Input
              id="enable-password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Préparation…" : "Activer la 2FA"}
          </Button>
        </form>
        {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
