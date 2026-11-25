"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ENTRY_TYPES, ENTRY_TYPE_LABELS, type EntryLike } from "@/lib/timesheet";

export function DayDialog({
  date,
  entry,
  unit,
  onSave,
  onClose,
}: {
  date: string;
  entry: EntryLike | undefined;
  unit: "day" | "hour";
  onSave: (entry: EntryLike) => void;
  onClose: () => void;
}) {
  const [quantity, setQuantity] = useState(entry?.quantity ?? 0);
  const [type, setType] = useState<EntryLike["type"]>(entry?.type ?? "worked");
  const [comment, setComment] = useState(entry?.comment ?? "");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Détails du ${date}`}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm space-y-4 rounded-lg border bg-background p-6 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="font-semibold">{date}</h2>
        <div className="space-y-2">
          <Label>Quantité ({unit === "day" ? "jours" : "heures"})</Label>
          {unit === "day" ? (
            <div className="flex gap-2">
              {[0, 0.25, 0.5, 1].map((value) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={quantity === value ? "default" : "outline"}
                  onClick={() => setQuantity(value)}
                >
                  {value}
                </Button>
              ))}
            </div>
          ) : (
            <Input
              type="number"
              step="0.25"
              min="0"
              max="24"
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value))}
            />
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="day-type">Type de journée</Label>
          <Select
            id="day-type"
            value={type}
            onChange={(event) => {
              const next = event.target.value as EntryLike["type"];
              setType(next);
              // Un congé / absence / astreinte vaut 1 jour par défaut :
              // sans quantité, la journée n'était pas enregistrée.
              if (
                quantity === 0 &&
                (next === "leave" || next === "unavailable" || next === "on_call")
              ) {
                setQuantity(1);
              }
            }}
          >
            {ENTRY_TYPES.map((item) => (
              <option key={item} value={item}>
                {ENTRY_TYPE_LABELS[item]}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="day-comment">Commentaire</Label>
          <Textarea
            id="day-comment"
            maxLength={500}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            type="button"
            onClick={() =>
              onSave({ date, quantity, type, comment: comment.trim() === "" ? null : comment })
            }
          >
            Enregistrer
          </Button>
        </div>
      </div>
    </div>
  );
}
