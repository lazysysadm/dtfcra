"use client";

import { Button } from "@/components/ui/button";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold">Une erreur est survenue</h1>
      <p className="max-w-md text-muted-foreground">
        Le chargement de la page a échoué. Réessayez ; si le problème persiste, rechargez
        l&apos;application.
      </p>
      <Button onClick={() => reset()}>Réessayer</Button>
    </main>
  );
}
