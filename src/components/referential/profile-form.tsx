"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { saveProfile } from "@/server/actions/referential";
import { LEGAL_FORMS } from "@/lib/validation/referential";
import { TERRITORIES, TERRITORY_LABELS } from "@/lib/holidays/territories";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export interface ProfileInitial {
  legalName: string;
  consultantName: string | null;
  legalForm: string | null;
  siret: string | null;
  address: string | null;
  vatNumber: string | null;
  brandColor: string;
  holidayTerritory: string;
}

export function ProfileForm({ initial }: { initial: ProfileInitial | null }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    const form = new FormData(event.currentTarget);
    setPending(true);
    const result = await saveProfile({
      legalName: String(form.get("legalName") ?? ""),
      consultantName: String(form.get("consultantName") ?? ""),
      legalForm: String(form.get("legalForm") ?? "") || null,
      siret: String(form.get("siret") ?? ""),
      address: String(form.get("address") ?? ""),
      vatNumber: String(form.get("vatNumber") ?? ""),
      brandColor: String(form.get("brandColor") ?? "#0f172a"),
      holidayTerritory: String(form.get("holidayTerritory") ?? "metropole"),
    });
    setPending(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setSuccess(true);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profil freelance</CardTitle>
        <CardDescription>
          Ces informations apparaissent sur les CRA et exports (PDF, Excel).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="legalName">Raison sociale *</Label>
              <Input
                id="legalName"
                name="legalName"
                required
                maxLength={200}
                defaultValue={initial?.legalName ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="consultantName">Nom prénom du collaborateur / consultant *</Label>
              <Input
                id="consultantName"
                name="consultantName"
                required
                maxLength={200}
                placeholder="Ex. Jean Dupont"
                defaultValue={initial?.consultantName ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="legalForm">Forme juridique</Label>
              <Select id="legalForm" name="legalForm" defaultValue={initial?.legalForm ?? ""}>
                <option value="">—</option>
                {LEGAL_FORMS.map((form) => (
                  <option key={form} value={form}>
                    {form}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="siret">SIRET (14 chiffres)</Label>
              <Input id="siret" name="siret" maxLength={14} defaultValue={initial?.siret ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vatNumber">N° TVA</Label>
              <Input
                id="vatNumber"
                name="vatNumber"
                placeholder="FRxxxxxxxxxxx"
                defaultValue={initial?.vatNumber ?? ""}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Adresse</Label>
            <Textarea
              id="address"
              name="address"
              maxLength={500}
              defaultValue={initial?.address ?? ""}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="brandColor">Couleur de marque</Label>
              <Input
                id="brandColor"
                name="brandColor"
                type="color"
                defaultValue={initial?.brandColor ?? "#0f172a"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="holidayTerritory">Territoire jours fériés (défaut)</Label>
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
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {success ? <p className="text-sm text-green-700">Profil enregistré.</p> : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
