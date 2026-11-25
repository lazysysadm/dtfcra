"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { updateMappingAction } from "@/server/actions/export";
import type { TemplateMapping } from "@/lib/validation/export-template";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const FIELDS: Array<{ key: keyof TemplateMapping; label: string; numeric?: boolean }> = [
  { key: "freelancerNameCell", label: "Cellule nom freelance" },
  { key: "consultantNameCell", label: "Cellule consultant" },
  { key: "clientNameCell", label: "Cellule client" },
  { key: "missionTitleCell", label: "Cellule mission" },
  { key: "periodCell", label: "Cellule période" },
  { key: "daysStartRow", label: "Ligne de début des jours", numeric: true },
  { key: "dateColumn", label: "Colonne date" },
  { key: "quantityColumn", label: "Colonne quantité" },
  { key: "typeColumn", label: "Colonne type" },
  { key: "commentColumn", label: "Colonne commentaire" },
  { key: "totalDaysCell", label: "Cellule total jours" },
];

export function MappingEditor({
  templateId,
  mapping,
}: {
  templateId: string;
  mapping: TemplateMapping;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    const form = new FormData(event.currentTarget);
    const next: Record<string, unknown> = {};
    for (const field of FIELDS) {
      const raw = String(form.get(field.key) ?? "").trim();
      next[field.key] = field.numeric ? (raw === "" ? null : Number(raw)) : raw === "" ? null : raw;
    }
    setPending(true);
    const result = await updateMappingAction(templateId, next);
    setPending(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setSuccess(true);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-3">
        {FIELDS.map((field) => (
          <div key={field.key} className="space-y-1">
            <Label htmlFor={`${field.key}-${templateId}`} className="text-xs">
              {field.label}
            </Label>
            <Input
              id={`${field.key}-${templateId}`}
              name={field.key}
              type={field.numeric ? "number" : "text"}
              defaultValue={String(mapping[field.key] ?? "")}
              className="h-8 text-xs"
            />
          </div>
        ))}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {success ? <p className="text-sm text-green-700">Mapping enregistré.</p> : null}
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer le mapping"}
      </Button>
    </form>
  );
}
