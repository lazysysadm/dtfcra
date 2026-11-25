"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createMissionAction, updateMissionAction } from "@/server/actions/referential";
import { TERRITORIES, TERRITORY_LABELS } from "@/lib/holidays/territories";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export interface MissionInitial {
  id: string;
  clientId: string;
  title: string;
  startDate: string;
  endDate: string | null;
  tjmCents: number;
  unit: "day" | "hour";
  hoursPerDay: number;
  holidayTerritory: string;
  status: "active" | "archived";
}

export function MissionForm({
  clients,
  initial,
}: {
  clients: Array<{ id: string; legalName: string }>;
  initial?: MissionInitial;
}) {
  const router = useRouter();
  const [clientId, setClientId] = useState(initial?.clientId ?? clients[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setError(null);
    setSuccess(false);
    const form = new FormData(formElement);
    const tjmEuros = Number(String(form.get("tjm") ?? "").replace(",", "."));
    if (!Number.isFinite(tjmEuros) || tjmEuros < 0) {
      setError("TJM invalide.");
      return;
    }
    const input = {
      clientId,
      title: String(form.get("title") ?? ""),
      startDate: String(form.get("startDate") ?? ""),
      endDate: String(form.get("endDate") ?? "") || null,
      tjmCents: Math.round(tjmEuros * 100),
      unit: String(form.get("unit") ?? "day"),
      hoursPerDay: Number(String(form.get("hoursPerDay") ?? "7").replace(",", ".")),
      holidayTerritory: String(form.get("holidayTerritory") ?? "metropole"),
      status: String(form.get("status") ?? "active"),
    };
    setPending(true);
    const result = initial
      ? await updateMissionAction(initial.id, input)
      : await createMissionAction(input);
    setPending(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    if (!initial) {
      formElement.reset();
      setClientId(clients[0]?.id ?? "");
    }
    setSuccess(true);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initial ? "Modifier la mission" : "Nouvelle mission"}</CardTitle>
        <CardDescription>
          TJM en euros HT (interface uniquement), unité jour ou heure.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="clientId">Client *</Label>
              <Select
                id="clientId"
                name="clientId"
                required
                value={clientId}
                onChange={(event) => setClientId(event.target.value)}
              >
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.legalName}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Intitulé *</Label>
              <Input
                id="title"
                name="title"
                required
                maxLength={200}
                defaultValue={initial?.title ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Date de début *</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                required
                defaultValue={initial?.startDate ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Date de fin</Label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                defaultValue={initial?.endDate ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tjm">TJM (€ HT) *</Label>
              <Input
                id="tjm"
                name="tjm"
                type="number"
                step="0.01"
                min="0"
                required
                defaultValue={initial ? (initial.tjmCents / 100).toFixed(2) : ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unité *</Label>
              <Select id="unit" name="unit" defaultValue={initial?.unit ?? "day"}>
                <option value="day">Jour</option>
                <option value="hour">Heure</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hoursPerDay">Heures / jour</Label>
              <Input
                id="hoursPerDay"
                name="hoursPerDay"
                type="number"
                step="0.25"
                min="0.5"
                max="24"
                defaultValue={initial?.hoursPerDay ?? 7}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="holidayTerritory">Territoire jours fériés</Label>
              <Select
                id="holidayTerritory"
                name="holidayTerritory"
                defaultValue={initial?.holidayTerritory ?? "metropole"}
              >
                {TERRITORIES.map((territory) => (
                  <option key={territory} value={territory}>
                    {TERRITORY_LABELS[territory]}
                  </option>
                ))}
              </Select>
            </div>
            {initial ? (
              <div className="space-y-2">
                <Label htmlFor="status">Statut</Label>
                <Select id="status" name="status" defaultValue={initial.status}>
                  <option value="active">Active</option>
                  <option value="archived">Archivée</option>
                </Select>
              </div>
            ) : null}
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {success ? <p className="text-sm text-green-700">Mission enregistrée.</p> : null}
          <Button type="submit" disabled={pending || clients.length === 0}>
            {pending ? "Enregistrement…" : initial ? "Mettre à jour" : "Créer la mission"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
