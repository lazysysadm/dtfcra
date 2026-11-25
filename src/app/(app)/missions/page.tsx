import Link from "next/link";
import { deleteMissionAction, setMissionStatusAction } from "@/server/actions/referential";
import { requireUser } from "@/server/auth/helpers";
import { listClients } from "@/server/services/clients";
import { listMissions } from "@/server/services/missions";
import { DeleteButton } from "@/components/referential/delete-button";
import { MissionForm } from "@/components/referential/mission-form";
import { StatusButton } from "@/components/referential/status-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { euroFormat } from "@/lib/format";

export default async function MissionsPage() {
  const { user } = await requireUser();
  const [missions, clients] = await Promise.all([listMissions(user.id), listClients(user.id)]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Missions</h1>
      {clients.length === 0 ? (
        <p className="text-muted-foreground">
          Créez d&apos;abord un{" "}
          <Link href="/clients" className="underline">
            client
          </Link>{" "}
          avant de créer une mission.
        </p>
      ) : (
        <MissionForm
          clients={clients.map((client) => ({ id: client.id, legalName: client.legalName }))}
        />
      )}
      {missions.length === 0 ? (
        <p className="text-muted-foreground">Aucune mission pour le moment.</p>
      ) : (
        <Card>
          <CardContent>
            <ul className="divide-y">
              {missions.map((mission) => {
                const client = clients.find((item) => item.id === mission.clientId);
                return (
                  <li key={mission.id} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <Link href={`/missions/${mission.id}`} className="font-medium underline">
                        {mission.title}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {client?.legalName ?? "Client inconnu"} ·{" "}
                        {euroFormat.format(mission.tjmCents / 100)} HT /{" "}
                        {mission.unit === "day" ? "jour" : "heure"} · depuis le {mission.startDate}
                      </p>
                    </div>
                    <Badge variant={mission.status === "active" ? "success" : "muted"}>
                      {mission.status === "active" ? "Active" : "Archivée"}
                    </Badge>
                    <StatusButton
                      missionId={mission.id}
                      currentStatus={mission.status}
                      action={setMissionStatusAction}
                    />
                    <DeleteButton
                      label="Supprimer"
                      confirmMessage={`Supprimer la mission « ${mission.title} » ?`}
                      action={deleteMissionAction}
                      id={mission.id}
                    />
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
