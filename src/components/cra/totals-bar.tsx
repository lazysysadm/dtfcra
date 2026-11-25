"use client";

import { Card, CardContent } from "@/components/ui/card";
import { euroFormat } from "@/lib/format";
import { useTtc, withTtc } from "@/lib/use-ttc";
import type { TimesheetTotals } from "@/lib/timesheet";

export function TotalsBar({ totals }: { totals: TimesheetTotals }) {
  const { ttc, toggle } = useTtc();
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <Card>
        <CardContent className="pt-0">
          <p className="text-2xl font-semibold">{totals.billableDays}</p>
          <p className="text-xs text-muted-foreground">Jours facturables</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-0">
          <p className="text-2xl font-semibold">{totals.halfDays}</p>
          <p className="text-xs text-muted-foreground">Demi-journées</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-0">
          <p className="text-2xl font-semibold">{totals.onCallDays}</p>
          <p className="text-xs text-muted-foreground">Astreintes</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-0">
          <p className="text-2xl font-semibold">{totals.leaveDays + totals.unavailableDays}</p>
          <p className="text-xs text-muted-foreground">Congés / absences</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-0">
          <p className="text-2xl font-semibold">
            {euroFormat.format(withTtc(totals.amountCents, ttc) / 100)}
          </p>
          <p className="text-xs text-muted-foreground">
            {ttc ? "Montant TTC (TVA 20 %)" : "Montant HT"}
          </p>
          <label className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <input type="checkbox" checked={ttc} onChange={toggle} className="size-3" />
            TTC
          </label>
        </CardContent>
      </Card>
    </div>
  );
}
