import Link from "next/link";
import { requireUser } from "@/server/auth/helpers";
import { listMissions } from "@/server/services/missions";
import { listTimesheets } from "@/server/services/timesheets";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ArchivePage() {
  const { user } = await requireUser();
  const [sheets, missions] = await Promise.all([listTimesheets(user.id), listMissions(user.id)]);
  const missionById = new Map(missions.map((mission) => [mission.id, mission]));
  const sorted = [...sheets].sort(
    (a, b) => b.year - a.year || b.month - a.month || a.missionId.localeCompare(b.missionId),
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Archive des CRA</h1>
      {sorted.length === 0 ? (
        <p className="text-muted-foreground">
          Aucun CRA enregistré.{" "}
          <Link href="/cra" className="underline">
            Saisir un CRA
          </Link>
        </p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Tous vos CRA par mois</CardTitle>
            <CardDescription>Téléchargez chaque CRA en PDF, Excel ou CSV.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {sorted.map((sheet) => {
                const mission = missionById.get(sheet.missionId);
                const period = `${String(sheet.month).padStart(2, "0")}/${sheet.year}`;
                return (
                  <li key={sheet.id} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{mission?.title ?? "Mission supprimée"}</p>
                      <p className="text-sm text-muted-foreground">
                        {mission?.unit === "hour" ? "Mode heures" : "Mode jour"} · {period}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button asChild variant="outline" size="sm">
                        <a href={`/api/exports/${sheet.id}?format=pdf`}>PDF</a>
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <a href={`/api/exports/${sheet.id}?format=xlsx`}>Excel</a>
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <a href={`/api/exports/${sheet.id}?format=csv`}>CSV</a>
                      </Button>
                    </div>
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
