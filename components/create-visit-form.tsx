"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type IndividualOption = { id: string; displayName: string; synthetic: boolean };
type VisitType = "MEDICAL" | "BEHAVIORAL_HEALTH" | "DSP_SHIFT";

export function CreateVisitForm({
  individuals,
  allowedTypes,
  defaultIndividualId,
}: {
  individuals: IndividualOption[];
  allowedTypes: VisitType[];
  defaultIndividualId?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const requested = defaultIndividualId || params.get("individualId") || "";
  const initial =
    individuals.some((ind) => ind.id === requested) ? requested : (individuals[0]?.id ?? "");
  const [individualId, setIndividualId] = useState(initial);
  const [visitType, setVisitType] = useState<VisitType>(allowedTypes[0] ?? "MEDICAL");
  const [scheduledAt, setScheduledAt] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const res = await fetch("/api/visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        individualId,
        visitType,
        scheduledAt: new Date(scheduledAt).toISOString(),
        reason,
        locationNote: visitType === "DSP_SHIFT" ? "Community / CLS shift" : "Zoom Healthcare (video only)",
        modality: visitType === "DSP_SHIFT" ? "SHIFT" : "TELEHEALTH",
      }),
    });
    const data = (await res.json()) as { visit?: { id: string }; error?: string };
    setBusy(false);
    if (!res.ok || !data.visit) {
      setMessage(data.error ?? "Unable to create visit");
      return;
    }
    router.push(`/visits/${data.visit.id}`);
  }

  return (
    <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
      <div className="space-y-1.5">
        <Label htmlFor="individual">Individual served</Label>
        <select
          id="individual"
          className="h-11 w-full rounded-md border border-border bg-elevated px-3 text-sm"
          value={individualId}
          onChange={(e) => setIndividualId(e.target.value)}
          required
        >
          {individuals.map((ind) => (
            <option key={ind.id} value={ind.id}>
              {ind.displayName}
              {ind.synthetic ? " · SYNTHETIC" : ""}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="type">Visit type</Label>
        <select
          id="type"
          className="h-11 w-full rounded-md border border-border bg-elevated px-3 text-sm"
          value={visitType}
          onChange={(e) => setVisitType(e.target.value as VisitType)}
        >
          {allowedTypes.map((t) => (
            <option key={t} value={t}>
              {t.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="when">Scheduled</Label>
        <Input
          id="when"
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reason">Reason / focus (staff charting)</Label>
        <Textarea
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          placeholder="Why this visit or shift is being documented"
        />
      </div>
      <Button type="submit" disabled={busy || !individualId}>
        Open visit
      </Button>
      {message && <p className="text-sm text-warn">{message}</p>}
    </form>
  );
}
