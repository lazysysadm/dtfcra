"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";
import { isWeekend } from "@/lib/holidays";
import { BILLABLE_TYPES, ENTRY_TYPE_LABELS, type EntryLike } from "@/lib/timesheet";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

// Full-cell fill: validated days are green, not a tiny dot.
function cellClasses(type: EntryLike["type"] | undefined, quantity: number): string {
  if (quantity <= 0) {
    return "";
  }
  if (type === "on_call") {
    return "border-orange-600 bg-orange-500 text-white";
  }
  if (type === "leave") {
    return "border-gray-500 bg-gray-300 text-gray-800";
  }
  if (type === "unavailable") {
    return "border-gray-400 bg-gray-200 text-gray-600";
  }
  if (quantity >= 1) {
    return "border-green-700 bg-green-600 text-white";
  }
  if (quantity >= 0.5) {
    return "border-green-600 bg-green-300 text-green-950";
  }
  return "border-green-500 bg-green-100 text-green-900";
}

export function CalendarGrid({
  year,
  month,
  days,
  entries,
  holidays,
  locked,
  selectedDate,
  onCycle,
  onEdit,
  onSelect,
}: {
  year: number;
  month: number;
  days: string[];
  entries: Map<string, EntryLike>;
  holidays: Record<string, string>;
  locked: boolean;
  selectedDate: string | null;
  onCycle: (date: string) => void;
  onEdit: (date: string) => void;
  onSelect: (date: string) => void;
}) {
  const cellRefs = useRef(new Map<string, HTMLButtonElement>());
  const firstWeekday = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;

  function focusDate(date: string) {
    onSelect(date);
    cellRefs.current.get(date)?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent, date: string) {
    const index = days.indexOf(date);
    const moves: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    if (event.key in moves) {
      event.preventDefault();
      const target = days[index + (moves[event.key] ?? 0)];
      if (target) {
        focusDate(target);
      }
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onCycle(date);
    }
  }

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-1">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1" role="grid" aria-label="Calendrier du mois">
        {Array.from({ length: firstWeekday }).map((_, index) => (
          <div key={`blank-${index}`} />
        ))}
        {days.map((date) => {
          const entry = entries.get(date);
          const holiday = holidays[date];
          const muted = isWeekend(date) || Boolean(holiday);
          const quantity = entry?.quantity ?? 0;
          return (
            <button
              key={date}
              type="button"
              ref={(node) => {
                if (node) {
                  cellRefs.current.set(date, node);
                } else {
                  cellRefs.current.delete(date);
                }
              }}
              role="gridcell"
              tabIndex={selectedDate === date ? 0 : -1}
              aria-label={`${date}${holiday ? ` (${holiday})` : ""}${quantity > 0 ? `, ${quantity} ${ENTRY_TYPE_LABELS[entry?.type ?? "worked"]}` : ""}`}
              disabled={locked}
              onClick={() => {
                onSelect(date);
                onCycle(date);
              }}
              onContextMenu={(event) => {
                event.preventDefault();
                onSelect(date);
                onEdit(date);
              }}
              onKeyDown={(event) => onKeyDown(event, date)}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-md border p-1 text-sm transition-colors",
                quantity > 0
                  ? cellClasses(entry?.type, quantity)
                  : muted
                    ? "border-gray-500 bg-gray-400 text-gray-900"
                    : "bg-background",
                selectedDate === date && "ring-2 ring-ring",
                !locked && "hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ring",
                locked && "cursor-not-allowed opacity-80",
              )}
            >
              <span className="text-xs">{Number(date.slice(8, 10))}</span>
              {quantity > 0 ? (
                <>
                  <span className="font-semibold">{quantity}</span>
                  {entry && !BILLABLE_TYPES.has(entry.type) ? (
                    <span className="text-[9px] uppercase opacity-80">
                      {entry.type === "on_call"
                        ? "astreinte"
                        : entry.type === "leave"
                          ? "congés"
                          : "absent"}
                    </span>
                  ) : null}
                </>
              ) : (
                <span className="text-[10px] opacity-70">
                  {holiday ? "férié" : muted ? "week-end" : "—"}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="size-3 rounded bg-green-600" /> Journée validée
        </span>
        <span className="flex items-center gap-1">
          <span className="size-3 rounded bg-green-300" /> Demi-journée
        </span>
        <span className="flex items-center gap-1">
          <span className="size-3 rounded bg-orange-500" /> Astreinte
        </span>
        <span className="flex items-center gap-1">
          <span className="size-3 rounded bg-gray-300" /> Congé / absent
        </span>
        <span className="flex items-center gap-1">
          <span className="size-3 rounded bg-gray-400" /> Week-end / férié
        </span>
      </div>
    </div>
  );
}
