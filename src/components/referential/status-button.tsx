"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/server/actions/referential";
import { Button } from "@/components/ui/button";

export function StatusButton({
  missionId,
  currentStatus,
  action,
}: {
  missionId: string;
  currentStatus: "active" | "archived";
  action: (id: string, status: "active" | "archived") => Promise<ActionResult>;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const nextStatus = currentStatus === "active" ? "archived" : "active";

  return (
    <div className="space-y-1">
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError(null);
          const result = await action(missionId, nextStatus);
          setPending(false);
          if (!result.success) {
            setError(result.error);
            return;
          }
          router.refresh();
        }}
      >
        {pending ? "…" : currentStatus === "active" ? "Archiver" : "Réactiver"}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
