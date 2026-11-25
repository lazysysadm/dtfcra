import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteContactAction } from "@/server/actions/referential";
import { requireUser } from "@/server/auth/helpers";
import { getClient } from "@/server/services/clients";
import { listContacts } from "@/server/services/contacts";
import { DomainError } from "@/server/services/errors";
import { listMissions } from "@/server/services/missions";
import { ClientForm } from "@/components/referential/client-form";
import { ContactForm } from "@/components/referential/contact-form";
import { DeleteButton } from "@/components/referential/delete-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requireUser();
  let client;
  try {
    client = await getClient(user.id, id);
  } catch (error) {
    if (error instanceof DomainError && error.code === "NOT_FOUND") {
      notFound();
    }
    throw error;
  }
  const [contacts, missions] = await Promise.all([
    listContacts(user.id, id),
    listMissions(user.id, { clientId: id }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{client.legalName}</h1>
        <Link href="/clients" className="text-sm underline">
          ← Tous les clients
        </Link>
      </div>
      <ClientForm
        initial={{
          id: client.id,
          legalName: client.legalName,
          siret: client.siret,
          address: client.address,
          notes: client.notes,
        }}
      />
      <Card>
        <CardHeader>
          <CardTitle>Contacts</CardTitle>
          <CardDescription>
            Le signataire reçoit le lien de validation des CRA (phase 5).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun contact.</p>
          ) : (
            <ul className="space-y-6">
              {contacts.map((contact) => (
                <li key={contact.id} className="space-y-2 border-b pb-4 last:border-b-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{contact.name}</p>
                    <DeleteButton
                      label="Supprimer"
                      confirmMessage={`Supprimer le contact « ${contact.name} » ?`}
                      action={deleteContactAction}
                      id={contact.id}
                    />
                  </div>
                  <ContactForm
                    clientId={id}
                    initial={{
                      id: contact.id,
                      name: contact.name,
                      email: contact.email,
                      role: contact.role,
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
          <div className="border-t pt-4">
            <p className="mb-2 text-sm font-medium">Nouveau contact</p>
            <ContactForm clientId={id} />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Missions de ce client</CardTitle>
        </CardHeader>
        <CardContent>
          {missions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune mission.{" "}
              <Link href="/missions" className="underline">
                Créer une mission
              </Link>
            </p>
          ) : (
            <ul className="divide-y">
              {missions.map((mission) => (
                <li key={mission.id} className="flex items-center justify-between gap-2 py-2">
                  <Link href={`/missions/${mission.id}`} className="text-sm underline">
                    {mission.title}
                  </Link>
                  <Badge variant={mission.status === "active" ? "success" : "muted"}>
                    {mission.status === "active" ? "Active" : "Archivée"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
