"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { assignTemplateAction, deleteTemplateAction } from "@/server/actions/export";
import type { TemplateMapping } from "@/lib/validation/export-template";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MappingEditor } from "./mapping-editor";

export interface TemplateItem {
  id: string;
  name: string;
  mapping: TemplateMapping;
}

export function TemplateManager({
  missionId,
  templates,
  assignedId,
}: {
  missionId: string;
  templates: TemplateItem[];
  assignedId: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setError(null);
    setPending(true);
    const form = new FormData(formElement);
    form.set("missionId", missionId);
    const response = await fetch("/api/templates", { method: "POST", body: form });
    setPending(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Téléversement impossible.");
      return;
    }
    formElement.reset();
    router.refresh();
  }

  async function onAssign(templateId: string | null) {
    setError(null);
    const result = await assignTemplateAction(missionId, templateId);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function onDelete(templateId: string) {
    if (!window.confirm("Supprimer ce gabarit ?")) {
      return;
    }
    setError(null);
    const result = await deleteTemplateAction(templateId);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Modèle d&apos;export Excel (gabarit client)</CardTitle>
        <CardDescription>
          Téléversez le .xlsx fourni par le client, ajustez le mapping des cellules, puis exportez
          le CRA en conservant la mise en forme du gabarit.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={onUpload} className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="template-name">Nom du modèle</Label>
            <Input id="template-name" name="name" required maxLength={100} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="template-file">Fichier .xlsx</Label>
            <Input id="template-file" name="file" type="file" accept=".xlsx" required />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Envoi…" : "Téléverser"}
          </Button>
        </form>
        {templates.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun gabarit enregistré.</p>
        ) : (
          <ul className="space-y-6">
            {templates.map((template) => (
              <li key={template.id} className="space-y-3 border-b pb-4 last:border-b-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">
                    {template.name}{" "}
                    {assignedId === template.id ? (
                      <span className="text-xs text-green-700">(actif pour cette mission)</span>
                    ) : null}
                  </p>
                  <div className="ml-auto flex gap-2">
                    {assignedId === template.id ? (
                      <Button size="sm" variant="outline" onClick={() => onAssign(null)}>
                        Retirer
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => onAssign(template.id)}>
                        Utiliser pour cette mission
                      </Button>
                    )}
                    <Button size="sm" variant="destructive" onClick={() => onDelete(template.id)}>
                      Supprimer
                    </Button>
                  </div>
                </div>
                <MappingEditor templateId={template.id} mapping={template.mapping} />
              </li>
            ))}
          </ul>
        )}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
