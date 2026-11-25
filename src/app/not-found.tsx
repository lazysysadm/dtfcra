import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold">Page introuvable</h1>
      <p className="max-w-md text-muted-foreground">
        La page demandée n&apos;existe pas ou n&apos;est plus disponible.
      </p>
      <Link href="/" className="text-sm underline">
        Retour au tableau de bord
      </Link>
    </main>
  );
}
