"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type SearchResult = {
  individuals: Array<{ id: string; displayName: string; program: string | null; synthetic: boolean }>;
  visits: Array<{
    id: string;
    reason: string;
    status: string;
    scheduledAt: string;
    individual: { displayName: string; synthetic: boolean };
  }>;
  notes: Array<{
    id: string;
    noteType: string;
    status: string;
    visit: { id: string; individual: { displayName: string } };
  }>;
};

export function SearchPanel() {
  const [q, setQ] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    const data = (await res.json()) as SearchResult;
    setResult(data);
    setBusy(false);
  }

  return (
    <div className="space-y-6">
      <form className="flex flex-wrap gap-3" onSubmit={(e) => void onSubmit(e)}>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Name, program, last-4, or visit focus"
          className="max-w-md"
        />
        <Button type="submit" disabled={busy}>
          Search
        </Button>
      </form>

      {result && (
        <div className="grid gap-6 md:grid-cols-3">
          <section>
            <h2 className="font-display text-2xl">Individuals</h2>
            <ul className="mt-3 space-y-2">
              {result.individuals.map((ind) => (
                <li key={ind.id}>
                  <Link href={`/individuals/${ind.id}`} className="text-sm hover:underline">
                    {ind.displayName}
                  </Link>
                  {ind.synthetic && (
                    <Badge className="ml-2" tone="warn">
                      SYNTHETIC
                    </Badge>
                  )}
                </li>
              ))}
              {result.individuals.length === 0 && <li className="text-sm text-muted">No matches.</li>}
            </ul>
          </section>
          <section>
            <h2 className="font-display text-2xl">Visits</h2>
            <ul className="mt-3 space-y-2">
              {result.visits.map((v) => (
                <li key={v.id}>
                  <Link href={`/visits/${v.id}`} className="text-sm hover:underline">
                    {v.individual.displayName} · {v.status}
                  </Link>
                </li>
              ))}
              {result.visits.length === 0 && <li className="text-sm text-muted">No matches.</li>}
            </ul>
          </section>
          <section>
            <h2 className="font-display text-2xl">Notes</h2>
            <ul className="mt-3 space-y-2">
              {result.notes.map((n) => (
                <li key={n.id}>
                  <Link href={`/visits/${n.visit.id}/notes/${n.id}`} className="text-sm hover:underline">
                    {n.visit.individual.displayName} · {n.noteType} · {n.status}
                  </Link>
                </li>
              ))}
              {result.notes.length === 0 && <li className="text-sm text-muted">No matches.</li>}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
