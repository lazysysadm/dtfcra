import { requireUser } from "@/server/auth/helpers";
import { DeleteAccountButton } from "@/components/delete-account-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DataPage() {
  await requireUser();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Mes données</h1>
      <Card>
        <CardHeader>
          <CardTitle>Exporter mes données (RGPD)</CardTitle>
          <CardDescription>
            Toutes vos données métier en JSON : profil, clients, contacts, missions, CRA et entrées.
            Les secrets d&apos;authentification ne sont jamais inclus.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <a href="/api/me/export">Télécharger l&apos;export JSON</a>
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Supprimer mon compte</CardTitle>
          <CardDescription>
            Suppression définitive du compte et de toutes les données associées (clients, missions,
            CRA, gabarits, logo). Irréversible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteAccountButton />
        </CardContent>
      </Card>
    </div>
  );
}
