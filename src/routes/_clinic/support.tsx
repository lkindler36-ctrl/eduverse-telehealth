import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCareStore } from "@/lib/eduverse/store";

export const Route = createFileRoute("/_clinic/support")({ component: Support });

function Support() {
  const { cases, fileCase, name, setName } = useCareStore();
  const [kind, setKind] = useState<"immigration" | "housing">("immigration");
  const [summary, setSummary] = useState("");

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-care">Community desk</p>
      <h1 className="mt-2 font-display text-4xl">Immigration and housing</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Support coordination for people relocating to Georgia and for housing applications
        routed through DBHDD partnerships. This preview stores intake on your device only.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Immigration</CardTitle>
            <CardDescription>Documentation, legal routing, community integration.</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Housing</CardTitle>
            <CardDescription>Applications, case management, support coordination.</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <form
        className="mt-8 space-y-4 rounded-xl bg-card p-5 shadow-[var(--shadow-border)]"
        onSubmit={(e) => {
          e.preventDefault();
          if (!summary.trim()) return;
          fileCase(kind, `${name}: ${summary.trim()}`);
          setSummary("");
        }}
      >
        <div className="flex gap-2">
          {(["immigration", "housing"] as const).map((k) => (
            <Button
              key={k}
              type="button"
              variant={kind === k ? "default" : "outline"}
              onClick={() => setKind(k)}
            >
              {k === "immigration" ? "Immigration" : "Housing"}
            </Button>
          ))}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="nm">Contact name</Label>
          <Input id="nm" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sum">What do you need?</Label>
          <Textarea
            id="sum"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Relocation from another state, housing voucher, documentation checklist…"
          />
        </div>
        <Button type="submit">Submit intake</Button>
      </form>

      <ul className="mt-8 space-y-3">
        {cases.map((c) => (
          <li key={c.id} className="rounded-xl bg-card p-4 shadow-[var(--shadow-border)]">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium capitalize">{c.kind} intake</p>
              <Badge tone="care">{c.status}</Badge>
            </div>
            <p className="mt-2 text-sm text-muted">{c.summary}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
