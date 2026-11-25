import Link from "next/link";
import { requireUser } from "@/server/auth/helpers";
import { listClients } from "@/server/services/clients";
import { listMissions } from "@/server/services/missions";
import { getProfile } from "@/server/services/profile";
import { dashboardStats } from "@/server/services/timesheet-stats";
import { RevenueCards } from "@/components/revenue-cards";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const percentFormat = new Intl.NumberFormat("fr-FR", {
  style: "percent",
  maximumFractionDigits: 0,
});

function currentPeriod(): { year: number; month: number } {
  const ym = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
  return { year: Number(ym.slice(0, 4)), month: Number(ym.slice(5, 7)) };
}

export default async function DashboardPage() {
  const { user } = await requireUser();
  const { year, month } = currentPeriod();
  const [clients, activeMissions, profile, stats] = await Promise.all([
    listClients(user.id),
    listMissions(user.id, { status: "active" }),
    getProfile(user.id),
    dashboardStats(user.id, year, month),
  ]);
  const maxDays = Math.max(1, ...stats.last12Months.map((item) => item.days));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Tableau de bord</h1>
        <Link href="/cra" className="text-sm underline">
          Saisir mes CRA →
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">{stats.monthBillableDays}</CardTitle>
            <CardDescription>Jours facturables du mois</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">{percentFormat.format(stats.occupancyRate)}</CardTitle>
            <CardDescription>Taux d&apos;occupation du mois</CardDescription>
          </CardHeader>
        </Card>
        <RevenueCards monthCents={stats.monthRevenueCents} yearCents={stats.yearRevenueCents} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Jours facturables — 12 derniers mois</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-end gap-2">
            {stats.last12Months.map((item) => (
              <div key={item.label} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[10px] text-muted-foreground">{item.days || ""}</span>
                <div
                  className="w-full rounded-t bg-primary/70"
                  style={{
                    height: `${(item.days / maxDays) * 100}%`,
                    minHeight: item.days > 0 ? 4 : 1,
                  }}
                />
                <span className="text-[10px] text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">{clients.length}</CardTitle>
            <CardDescription>Clients</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/clients" className="text-sm underline">
              Gérer les clients
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">{activeMissions.length}</CardTitle>
            <CardDescription>Missions actives</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/missions" className="text-sm underline">
              Gérer les missions
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">{profile ? "✓" : "—"}</CardTitle>
            <CardDescription>Profil freelance</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/settings/profile" className="text-sm underline">
              {profile ? "Modifier le profil" : "Compléter le profil"}
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
