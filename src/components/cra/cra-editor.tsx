"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearMonthAction,
  copyPreviousMonthAction,
  fillWorkingDaysAction,
  saveEntriesAction,
} from "@/server/actions/cra";
import type { ActionResult } from "@/server/actions/result";
import { computeTotals, nextQuantity, type EntryLike, type MissionLike } from "@/lib/timesheet";
import { Button } from "@/components/ui/button";
import { CalendarGrid } from "./calendar-grid";
import { DayDialog } from "./day-dialog";
import { TotalsBar } from "./totals-bar";

export interface EditorTimesheet {
  id: string;
  year: number;
  month: number;
  updatedAt: number;
}

export function CraEditor({
  timesheet,
  mission,
  initialEntries,
  holidays,
  days,
}: {
  timesheet: EditorTimesheet;
  mission: MissionLike & { id: string; title: string };
  initialEntries: EntryLike[];
  holidays: Record<string, string>;
  days: string[];
}) {
  const router = useRouter();
  const [entries, setEntries] = useState(() => new Map(initialEntries.map((e) => [e.date, e])));
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(days[0] ?? null);
  const [dialogDate, setDialogDate] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const updatedAtRef = useRef(timesheet.updatedAt);
  const inFlight = useRef(false);

  // State resets via the component key on the server page (id:updatedAt)
  // whenever a server mutation occurs — no prop-sync effect needed.

  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    },
    [],
  );

  // Warn before leaving the page while changes are unsaved or failed to save.
  useEffect(() => {
    if (saveState !== "saving" && saveState !== "error") {
      return;
    }
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [saveState]);

  const totals = computeTotals([...entries.values()], mission);

  function scheduleSave(next: Map<string, EntryLike>) {
    setEntries(next);
    setSaveState("saving");
    setError(null);
    if (timer.current) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(async () => {
      // One save in flight at a time; coalesce rapid edits via the debounce.
      if (inFlight.current) {
        scheduleSave(next);
        return;
      }
      inFlight.current = true;
      const result = await saveEntriesAction(
        timesheet.id,
        [...next.values()],
        updatedAtRef.current,
      );
      inFlight.current = false;
      if (result.success) {
        if (result.updatedAt) {
          updatedAtRef.current = result.updatedAt;
        }
        setSaveState("saved");
      } else {
        setSaveState("error");
        setError(result.error);
      }
    }, 800);
  }

  function cycle(date: string) {
    const existing = entries.get(date);
    const quantity = nextQuantity(existing?.quantity ?? 0);
    const next = new Map(entries);
    if (quantity === 0) {
      next.delete(date);
    } else {
      next.set(date, {
        date,
        quantity,
        type: existing?.type ?? "worked",
        comment: existing?.comment ?? null,
      });
    }
    scheduleSave(next);
  }

  function saveDay(entry: EntryLike) {
    const next = new Map(entries);
    if (entry.quantity === 0) {
      next.delete(entry.date);
    } else {
      next.set(entry.date, entry);
    }
    setDialogDate(null);
    scheduleSave(next);
  }

  async function runAction(action: (id: string) => Promise<ActionResult>, confirmMessage?: string) {
    if (confirmMessage && !window.confirm(confirmMessage)) {
      return;
    }
    setPending(true);
    setError(null);
    const result = await action(timesheet.id);
    setPending(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold">{mission.title}</h2>
        <span className="ml-auto text-sm" aria-live="polite">
          {saveState === "saving" && "Enregistrement…"}
          {saveState === "saved" && <span className="text-green-700">Enregistré ✓</span>}
          {saveState === "error" && <span className="text-destructive">Non enregistré</span>}
        </span>
      </div>
      <TotalsBar totals={totals} />
      <CalendarGrid
        year={timesheet.year}
        month={timesheet.month}
        days={days}
        entries={entries}
        holidays={holidays}
        locked={false}
        selectedDate={selectedDate}
        onCycle={cycle}
        onEdit={(date) => setDialogDate(date)}
        onSelect={setSelectedDate}
      />
      <p className="text-xs text-muted-foreground">
        Clic : cycle 1 → 0,5 → 0. Clic droit (ou bouton ci-dessous) : type de journée et
        commentaire. Flèches + Entrée au clavier.
      </p>
      {error ? (
        <div className="flex items-center gap-2">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={() => router.refresh()}>
            Recharger
          </Button>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => runAction(fillWorkingDaysAction)}
        >
          Remplir les jours ouvrés
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => runAction(copyPreviousMonthAction)}
        >
          Copier le mois précédent
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => runAction(clearMonthAction, "Vider tout le mois ?")}
        >
          Vider
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!selectedDate}
          onClick={() => selectedDate && setDialogDate(selectedDate)}
        >
          Modifier le jour sélectionné
        </Button>
      </div>
      {dialogDate ? (
        <DayDialog
          date={dialogDate}
          entry={entries.get(dialogDate)}
          unit={mission.unit}
          onSave={saveDay}
          onClose={() => setDialogDate(null)}
        />
      ) : null}
    </div>
  );
}
