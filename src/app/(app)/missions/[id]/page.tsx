import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteMissionAction, setMissionStatusAction } from "@/server/actions/referential";
import { requireUser } from "@/server/auth/helpers";
import { listClients } from "@/server/services/clients";
import { DomainError } from "@/server/services/errors";
import { getMission } from "@/server/services/missions";
import { listTemplates } from "@/server/services/templates";
import { findTimesheet } from "@/server/services/timesheets";
import type { TemplateMapping } from "@/lib/validation/export-template";
import { DeleteButton } from "@/components/referential/delete-button";
import { MissionForm } from "@/components/referential/mission-form";
import { StatusButton } from "@/components/referential/status-button";
import { TemplateManager } from "@/components/export/template-manager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function MissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requireUser();
  let mission;
  try {
    mission = await getMission(user.id, id);
  } catch (error) {
    if (error instanceof DomainError && error.code === "NOT_FOUND") {
      notFound();
    }
    throw error;
  }
  const [clients, templates] = await Promise.all([listClients(user.id), listTemplates(user.id)]);
  const client = clients.find((item) => item.id === mission.clientId);
  const ym = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
  const year = Number(ym.slice(0, 4));
  const month = Number(ym.slice(5, 7));
  const { timesheet } = await findTimesheet(user.id, mission.id, year, month);
  const monthLabel = new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{mission.title}</h1>
        <div className="flex items-center gap-2">
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
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Client :{" "}
        {client ? (
          <Link href={`/clients/${client.id}`} className="underline">
            {client.legalName}
          </Link>
        ) : (
          "inconnu"
        )}{" "}
        ·{" "}
        <Link href={`/cra?mission=${mission.id}`} className="underline">
          Saisir le CRA →
        </Link>
      </p>
      <Card>
        <CardHeader>
          <CardTitle>Générer le CRA — {monthLabel}</CardTitle>
          <CardDescription>
            Export du mois en cours. Pour saisir ou modifier les jours, ouvrez le calendrier.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {timesheet ? (
            <>
              <Button asChild variant="outline" size="sm">
                <a href={`/api/exports/${timesheet.id}?format=pdf`}>PDF</a>
              </Button>
              <Button asChild variant="outline" size="sm">
                <a href={`/api/exports/${timesheet.id}?format=xlsx`}>Excel</a>
              </Button>
              <Button asChild variant="outline" size="sm">
                <a href={`/api/exports/${timesheet.id}?format=csv`}>CSV</a>
              </Button>
              {mission.exportTemplateId ? (
                <Button asChild variant="outline" size="sm">
                  <a href={`/api/exports/${timesheet.id}?format=template`}>Excel gabarit client</a>
                </Button>
              ) : null}
            </>
          ) : (
            <span className="text-sm text-muted-foreground">
              Aucun CRA ce mois-ci : ouvrez le calendrier pour le créer.
            </span>
          )}
          <Button asChild size="sm">
            <Link href={`/cra?mission=${mission.id}`}>Ouvrir le calendrier</Link>
          </Button>
        </CardContent>
      </Card>
      <MissionForm
        clients={clients.map((item) => ({ id: item.id, legalName: item.legalName }))}
        initial={{
          id: mission.id,
          clientId: mission.clientId,
          title: mission.title,
          startDate: mission.startDate,
          endDate: mission.endDate,
          tjmCents: mission.tjmCents,
          unit: mission.unit,
          hoursPerDay: Number(mission.hoursPerDay),
          holidayTerritory: mission.holidayTerritory,
          status: mission.status,
        }}
      />
      <TemplateManager
        missionId={mission.id}
        templates={templates.map((template) => ({
          id: template.id,
          name: template.name,
          mapping: template.mapping as TemplateMapping,
        }))}
        assignedId={mission.exportTemplateId}
      />
    </div>
  );
}
