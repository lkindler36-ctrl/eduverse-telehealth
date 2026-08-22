import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PROVIDERS, SLOTS } from "@/lib/eduverse/catalog";
import { providerById, useCareStore } from "@/lib/eduverse/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast, Toaster } from "sonner";

export const Route = createFileRoute("/_clinic/care")({ component: CareBoard });

function CareBoard() {
  const { name, setName, appointments, book, cancel } = useCareStore();
  const [providerId, setProviderId] = useState(PROVIDERS[0]?.id ?? "martinez");
  const [slot, setSlot] = useState(SLOTS[5] ?? "14:30");
  const [reason, setReason] = useState("Follow-up visit");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const appt = book(providerId, slot, reason.trim() || "Visit");
    const p = providerById(appt.providerId);
    toast.success(`Booked ${p?.name ?? "clinician"} at ${slot}`);
  };

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[1fr_20rem]">
      <Toaster theme="light" />
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-care">Care board</p>
        <h1 className="mt-2 font-display text-4xl">Clinicians across Georgia</h1>
        <p className="mt-3 max-w-xl text-muted">
          Choose a provider, pick a slot, and keep the visit on this device. Join the room when you are ready.
        </p>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {PROVIDERS.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setProviderId(p.id)}
                className="h-full w-full rounded-xl bg-card p-4 text-left shadow-[var(--shadow-border)] transition-[transform] duration-150 hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-sm text-muted">
                      {p.creds} · {p.specialty}
                    </p>
                  </div>
                  {providerId === p.id && <Badge tone="care">Selected</Badge>}
                </div>
                <p className="mt-3 text-sm text-muted">{p.bio}</p>
                <p className="mt-3 font-mono text-xs text-subtle">
                  {p.city} · Next {p.next}
                </p>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <aside className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Book visit</CardTitle>
            <CardDescription>Stored locally on this browser only.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={submit}>
              <div className="space-y-1.5">
                <Label htmlFor="patient">Your name</Label>
                <Input id="patient" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="slot">Slot</Label>
                <select
                  id="slot"
                  value={slot}
                  onChange={(e) => setSlot(e.target.value)}
                  className="h-11 w-full rounded-md border border-border bg-elevated px-3 text-sm"
                >
                  {SLOTS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reason">Reason</Label>
                <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
              <Button type="submit" className="w-full">
                Confirm booking
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {appointments.length === 0 && (
              <p className="text-sm text-muted">No visits yet.</p>
            )}
            {appointments.map((a) => {
              const p = providerById(a.providerId);
              return (
                <div key={a.id} className="rounded-lg bg-elevated p-3">
                  <p className="text-sm font-medium">{p?.name}</p>
                  <p className="font-mono text-xs text-muted">
                    {a.when} · {a.reason}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Button asChild size="sm">
                      <Link to="/visit">Join room</Link>
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => cancel(a.id)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </aside>
    </main>
  );
}
