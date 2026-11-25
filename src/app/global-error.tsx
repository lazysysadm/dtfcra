"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-2xl font-semibold">Erreur inattendue</h1>
        <p className="max-w-md text-gray-600">
          L&apos;application a rencontré un problème. Rechargez la page pour continuer.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-md bg-black px-4 py-2 text-sm text-white"
        >
          Recharger
        </button>
      </body>
    </html>
  );
}
