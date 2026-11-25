import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/helpers";
import { getHolidays, isWeekend, monthDays } from "@/lib/holidays";
import type { Territory } from "@/lib/holidays/territories";
import { DomainError } from "@/server/services/errors";
import { listMissions } from "@/server/services/missions";
import { dailyTotals } from "@/server/services/timesheet-stats";
import { findTimesheet } from "@/server/services/timesheets";
import { getProfile } from "@/server/services/profile";
import { createTimesheetAction } from "@/server/actions/cra";
import { CraEditor } from "@/components/cra/cra-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function currentYm(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
  })
    .format(new Date())
    .slice(0, 7);
}

function shiftYm(ym: string, delta: number): string {
  const date = new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function CraPage({
  searchParams,
}: {
  searchParams: Promise<{ mission?: string; ym?: string }>;
}) {
  const { user } = await requireUser();
  const params = await searchParams;
  const missions = await listMissions(user.id, { status: "active" });
  const ym = /^\d{4}-(0[1-9]|1[0-2])$/.test(params.ym ?? "") ? (params.ym as string) : currentYm();
  const year = Number(ym.slice(0, 4));
  const month = Number(ym.slice(5, 7));
  const selected = params.mission ?? "all";
  const days = monthDays(year, month);
  const monthLabel = new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));

  const nav = (
    <div className="flex flex-wrap items-center gap-2">
      <Link href={`/cra?mission=${selected}&ym=${shiftYm(ym, -1)}`} className="text-sm underline">
        ← Mois précédent
      </Link>
      <span className="font-medium capitalize">{monthLabel}</span>
      <Link href={`/cra?mission=${selected}&ym=${shiftYm(ym, 1)}`} className="text-sm underline">
        Mois suivant →
      </Link>
    </div>
  );

  const missionNav = (
    <div className="flex flex-wrap gap-2 text-sm">
      <Link
        href={`/cra?mission=all&ym=${ym}`}
        className={cn("underline", selected === "all" && "font-semibold")}
      >
        Toutes les missions
      </Link>
      {missions.map((mission) => (
        <Link
          key={mission.id}
          href={`/cra?mission=${mission.id}&ym=${ym}`}
          className={cn("underline", selected === mission.id && "font-semibold")}
        >
          {mission.title}
        </Link>
      ))}
    </div>
  );

  if (missions.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">CRA</h1>
        <p className="text-muted-foreground">
          Créez d&apos;abord une{" "}
          <Link href="/missions" className="underline">
            mission
          </Link>{" "}
          pour saisir vos CRA.
        </p>
      </div>
    );
  }

  if (selected === "all") {
    const totals = await dailyTotals(user.id, year, month);
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">CRA — vue consolidée</h1>
        {nav}
        {missionNav}
        {totals.overLimitDates.length > 0 ? (
          <p className="text-sm text-destructive">
            ⚠ Total journalier supérieur à 1 jour : {totals.overLimitDates.join(", ")}. Corrigez les
            missions concernées.
          </p>
        ) : null}
        <Card>
          <CardContent>
            <div className="grid grid-cols-7 gap-1">
              {days.map((date) => {
                const total = totals.totals[date] ?? 0;
                return (
                  <div
                    key={date}
                    className={cn(
                      "flex min-h-12 flex-col items-center justify-center rounded-md border p-1 text-sm",
                      isWeekend(date) && "bg-muted/60 text-muted-foreground",
                      total > 1.000000001 && "border-destructive bg-destructive/10 font-semibold",
                      total > 0 && total <= 1.000000001 && "bg-primary/5",
                    )}
                  >
                    <span className="text-xs">{Number(date.slice(8, 10))}</span>
                    <span>{total > 0 ? total : "—"}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <h2 className="mb-2 font-medium">Jours facturables par mission (mois)</h2>
            {totals.perMission.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune saisie ce mois-ci.</p>
            ) : (
              <ul className="divide-y">
                {totals.perMission.map((item) => (
                  <li
                    key={item.missionId}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <Link href={`/cra?mission=${item.missionId}&ym=${ym}`} className="underline">
                      {item.title}
                    </Link>
                    <span>{item.days} j</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  let data;
  try {
    data = await findTimesheet(user.id, selected, year, month);
  } catch (error) {
    if (error instanceof DomainError && error.code === "NOT_FOUND") {
      redirect("/cra");
    }
    throw error;
  }
  const holidays = Object.fromEntries(
    getHolidays(year, data.mission.holidayTerritory as Territory),
  );
  const profile = await getProfile(user.id);
  const consultant = profile?.consultantName ?? user.name;
  const sheet = data.timesheet;

  if (!sheet) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold">CRA</h1>
          <span className="text-sm text-muted-foreground">Consultant : {consultant}</span>
        </div>
        {nav}
        {missionNav}
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3">
            <p className="text-sm">Aucun CRA pour {monthLabel} sur cette mission.</p>
            <form action={createTimesheetAction.bind(null, data.mission.id, year, month)}>
              <Button type="submit" size="sm">
                Créer le CRA du mois
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">CRA</h1>
        <span className="text-sm text-muted-foreground">Consultant : {consultant}</span>
      </div>
      {nav}
      {missionNav}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 pt-0">
          <span className="text-sm font-semibold">Générer le CRA ({monthLabel}) :</span>
          <Button asChild size="sm">
            <a href={`/api/exports/${sheet.id}?format=pdf`}>PDF</a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={`/api/exports/${sheet.id}?format=xlsx`}>Excel</a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={`/api/exports/${sheet.id}?format=csv`}>CSV</a>
          </Button>
          {data.mission.exportTemplateId ? (
            <Button asChild variant="secondary" size="sm">
              <a href={`/api/exports/${sheet.id}?format=template`}>Excel gabarit client</a>
            </Button>
          ) : null}
        </CardContent>
      </Card>
      <CraEditor
        key={`${sheet.id}-${sheet.updatedAt.getTime()}`}
        timesheet={{
          id: sheet.id,
          year,
          month,
          updatedAt: sheet.updatedAt.getTime(),
        }}
        mission={{
          id: data.mission.id,
          title: data.mission.title,
          tjmCents: data.mission.tjmCents,
          unit: data.mission.unit,
          hoursPerDay: Number(data.mission.hoursPerDay),
        }}
        initialEntries={data.entries}
        holidays={holidays}
        days={days}
      />
    </div>
  );
}
