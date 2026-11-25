import Link from "next/link";
import { deleteClientAction } from "@/server/actions/referential";
import { requireUser } from "@/server/auth/helpers";
import { listClients } from "@/server/services/clients";
import { ClientForm } from "@/components/referential/client-form";
import { DeleteButton } from "@/components/referential/delete-button";
import { Card, CardContent } from "@/components/ui/card";

export default async function ClientsPage() {
  const { user } = await requireUser();
  const clients = await listClients(user.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Clients</h1>
      <ClientForm />
      {clients.length === 0 ? (
        <p className="text-muted-foreground">
          Aucun client pour le moment. Créez votre premier client ci-dessus.
        </p>
      ) : (
        <Card>
          <CardContent>
            <ul className="divide-y">
              {clients.map((client) => (
                <li key={client.id} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <Link href={`/clients/${client.id}`} className="font-medium underline">
                      {client.legalName}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {client.siret ?? "SIRET non renseigné"}
                    </p>
                  </div>
                  <DeleteButton
                    label="Supprimer"
                    confirmMessage={`Supprimer le client « ${client.legalName} » ?`}
                    action={deleteClientAction}
                    id={client.id}
                  />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
