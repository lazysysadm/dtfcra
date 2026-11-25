"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/server/actions/referential";
import { Button } from "@/components/ui/button";

export function DeleteButton({
  label,
  confirmMessage,
  action,
  id,
}: {
  label: string;
  confirmMessage: string;
  action: (id: string) => Promise<ActionResult>;
  id: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className="space-y-1">
      <Button
        variant="destructive"
        size="sm"
        disabled={pending}
        onClick={async () => {
          if (!window.confirm(confirmMessage)) {
            return;
          }
          setPending(true);
          setError(null);
          const result = await action(id);
          setPending(false);
          if (!result.success) {
            setError(result.error);
            return;
          }
          router.refresh();
        }}
      >
        {pending ? "Suppression…" : label}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
