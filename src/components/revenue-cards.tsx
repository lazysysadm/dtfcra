"use client";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { euroFormat } from "@/lib/format";
import { useTtc, withTtc } from "@/lib/use-ttc";

// CA prévisionnel — interface uniquement (jamais dans les exports).
export function RevenueCards({ monthCents, yearCents }: { monthCents: number; yearCents: number }) {
  const { ttc, toggle } = useTtc();
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">
            {euroFormat.format(withTtc(monthCents, ttc) / 100)}
          </CardTitle>
          <CardDescription>{ttc ? "CA TTC du mois (TVA 20 %)" : "CA HT du mois"}</CardDescription>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">
            {euroFormat.format(withTtc(yearCents, ttc) / 100)}
          </CardTitle>
          <CardDescription>
            {ttc ? "CA TTC de l'année (TVA 20 %)" : "CA HT de l'année"}
          </CardDescription>
        </CardHeader>
      </Card>
      <label className="flex items-center gap-2 text-sm text-muted-foreground sm:col-span-2 lg:col-span-4">
        <input type="checkbox" checked={ttc} onChange={toggle} className="size-4" />
        Afficher les montants TTC (TVA 20 %)
      </label>
    </>
  );
}
