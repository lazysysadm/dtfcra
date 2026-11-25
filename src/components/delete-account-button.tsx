"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteAccountAction } from "@/server/actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DeleteAccountButton() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="delete-password">Confirmez avec votre mot de passe</Label>
        <Input
          id="delete-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      <Button
        variant="destructive"
        disabled={pending || password.length === 0}
        onClick={async () => {
          if (
            !window.confirm(
              "Supprimer définitivement votre compte et toutes vos données ? Cette action est irréversible.",
            )
          ) {
            return;
          }
          setPending(true);
          const result = await deleteAccountAction(password);
          setPending(false);
          if (!result.success) {
            setError(result.error);
            return;
          }
          router.push("/register");
          router.refresh();
        }}
      >
        {pending ? "Suppression…" : "Supprimer mon compte"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
