import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/helpers";
import { DomainError } from "@/server/services/errors";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function AppLayout({ children }: { children: ReactNode }) {
  try {
    await requireUser();
  } catch (error) {
    if (error instanceof DomainError && error.code === "UNAUTHORIZED") {
      redirect("/login");
    }
    throw error;
  }

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
          <Link href="/" className="font-semibold">
            dtfcra
          </Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            Tableau de bord
          </Link>
          <Link href="/clients" className="text-sm text-muted-foreground hover:text-foreground">
            Clients
          </Link>
          <Link href="/missions" className="text-sm text-muted-foreground hover:text-foreground">
            Missions
          </Link>
          <Link href="/cra" className="text-sm text-muted-foreground hover:text-foreground">
            CRA
          </Link>
          <Link href="/archive" className="text-sm text-muted-foreground hover:text-foreground">
            Archive
          </Link>
          <Link
            href="/settings/profile"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Profil
          </Link>
          <Link
            href="/settings/security"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Sécurité
          </Link>
          <Link
            href="/settings/data"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Données
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <SignOutButton />
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
