"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { VisitStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";

export function VisitStatusForm({ visitId, status }: { visitId: string; status: VisitStatus }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const payload: Record<string, string> = { status: value };
    if (value === "IN_PROGRESS") payload.startedAt = new Date().toISOString();
    if (value === "COMPLETED") payload.endedAt = new Date().toISOString();
    await fetch(`/api/visits/${visitId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <select
        className="h-11 rounded-md border border-border bg-elevated px-3 text-sm"
        value={value}
        onChange={(e) => setValue(e.target.value as VisitStatus)}
      >
        <option value="SCHEDULED">Scheduled</option>
        <option value="IN_PROGRESS">In progress</option>
        <option value="COMPLETED">Completed</option>
        <option value="CANCELLED">Cancelled</option>
      </select>
      <Button type="button" variant="outline" disabled={busy} onClick={() => void save()}>
        Update visit
      </Button>
    </div>
  );
}
