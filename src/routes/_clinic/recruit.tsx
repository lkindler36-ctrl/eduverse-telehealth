import { createFileRoute } from "@tanstack/react-router";
import { JOBS } from "@/lib/eduverse/catalog";
import { useCareStore } from "@/lib/eduverse/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_clinic/recruit")({ component: Recruit });

function Recruit() {
  const { applications, applyJob } = useCareStore();
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-care">
        Healthcare recruiting
      </p>
      <h1 className="mt-2 font-display text-4xl">Georgia licenses wanted</h1>
      <p className="mt-3 text-muted">
        EduVerse hires clinicians, coordinators, and case specialists for virtual care and
        community programs. Applications in this preview stay on your device.
      </p>
      <ul className="mt-8 space-y-3">
        {JOBS.map((j) => {
          const applied = applications.includes(j.id);
          return (
            <li key={j.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
              <div>
                <h2 className="font-medium">{j.title}</h2>
                <p className="text-sm text-muted">
                  {j.team} · {j.loc}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge>{j.type}</Badge>
                <Button
                  size="sm"
                  variant={applied ? "outline" : "default"}
                  disabled={applied}
                  onClick={() => applyJob(j.id)}
                >
                  {applied ? "Applied" : "Apply"}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
