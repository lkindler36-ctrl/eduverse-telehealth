"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { NoteType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

type NoteFormProps = {
  noteId: string;
  noteType: NoteType;
  locked: boolean;
  initial: Record<string, string>;
  canEdit: boolean;
};

const SOAP_FIELDS = [
  ["subjective", "Subjective"],
  ["objective", "Objective"],
  ["assessment", "Assessment"],
  ["plan", "Plan"],
] as const;

const BH_FIELDS = [
  ["presentation", "Presentation / mental status"],
  ["interventions", "Interventions"],
  ["response", "Response"],
  ["risk", "Risk / safety"],
  ["plan", "Plan"],
] as const;

const DSP_FIELDS = [
  ["supports", "Supports provided"],
  ["adls", "ADLs / IADLs"],
  ["incidents", "Incidents"],
  ["narrative", "Shift narrative"],
] as const;

export function NoteForm({ noteId, noteType, locked, initial, canEdit }: NoteFormProps) {
  const router = useRouter();
  const [content, setContent] = useState<Record<string, string>>(initial);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const fields =
    noteType === "SOAP" ? SOAP_FIELDS : noteType === "BH_PROGRESS" ? BH_FIELDS : DSP_FIELDS;

  async function save() {
    setBusy(true);
    setMessage("");
    const res = await fetch(`/api/notes/${noteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setMessage(data.error ?? "Save failed");
      return;
    }
    setMessage("Draft saved.");
    router.refresh();
  }

  async function lock() {
    if (!window.confirm("Lock and sign this note? It cannot be edited after lock.")) return;
    setBusy(true);
    setMessage("");
    const saveRes = await fetch(`/api/notes/${noteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!saveRes.ok) {
      setBusy(false);
      const data = (await saveRes.json()) as { error?: string };
      setMessage(data.error ?? "Save failed");
      return;
    }
    const res = await fetch(`/api/notes/${noteId}/lock`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setMessage(data.error ?? "Lock failed");
      return;
    }
    setMessage("Note signed and locked.");
    router.refresh();
  }

  const readOnly = locked || !canEdit;

  return (
    <div className="space-y-4">
      {noteType === "DSP_SHIFT" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="shiftStart">Shift start</Label>
            <Input
              id="shiftStart"
              type="datetime-local"
              value={content.shiftStart ?? ""}
              disabled={readOnly}
              onChange={(e) => setContent((c) => ({ ...c, shiftStart: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="shiftEnd">Shift end</Label>
            <Input
              id="shiftEnd"
              type="datetime-local"
              value={content.shiftEnd ?? ""}
              disabled={readOnly}
              onChange={(e) => setContent((c) => ({ ...c, shiftEnd: e.target.value }))}
            />
          </div>
        </div>
      )}

      {fields.map(([key, label]) => (
        <div key={key} className="space-y-1.5">
          <Label htmlFor={key}>{label}</Label>
          <Textarea
            id={key}
            className="min-h-32"
            value={content[key] ?? ""}
            disabled={readOnly}
            onChange={(e) => setContent((c) => ({ ...c, [key]: e.target.value }))}
          />
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        {canEdit && !locked && (
          <>
            <Button type="button" onClick={() => void save()} disabled={busy}>
              Save draft
            </Button>
            <Button type="button" variant="outline" onClick={() => void lock()} disabled={busy}>
              Sign and lock
            </Button>
          </>
        )}
        <a
          className="text-sm text-care underline-offset-4 hover:underline"
          href={`/api/notes/${noteId}/pdf`}
        >
          Export PDF
        </a>
        {message && <p className="text-sm text-muted">{message}</p>}
      </div>
    </div>
  );
}
