"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { NoteType } from "@prisma/client";
import { Button } from "@/components/ui/button";

export function StartNoteButton({
  visitId,
  noteType,
}: {
  visitId: string;
  noteType: NoteType;
  label?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitId, noteType }),
    });
    const data = (await res.json()) as { note?: { id: string }; error?: string };
    setBusy(false);
    if (!res.ok || !data.note) {
      setError(data.error ?? "Unable to start note");
      return;
    }
    router.push(`/visits/${visitId}/notes/${data.note.id}`);
  }

  return (
    <div className="space-y-2">
      <Button type="button" onClick={() => void start()} disabled={busy}>
        Start {noteType.replaceAll("_", " ").toLowerCase()} note
      </Button>
      {error && <p className="text-sm text-warn">{error}</p>}
    </div>
  );
}
