import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { assignedIndividualIds } from "@/lib/access";
import { requireStaff } from "@/lib/staff-page";
import { formatDateTime } from "@/lib/utils";
import { StaffShell } from "@/components/staff-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function VisitsPage() {
  const user = await requireStaff();
  const ids = await assignedIndividualIds(user.id, user.role);
  const visits = await prisma.visit.findMany({
    where: { individualId: { in: ids } },
    include: {
      individual: { select: { displayName: true, synthetic: true } },
      notes: { select: { id: true, status: true } },
    },
    orderBy: { scheduledAt: "desc" },
  });

  return (
    <StaffShell user={user} pathname="/visits">
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-care">Visits</p>
            <h1 className="mt-2 font-display text-4xl">Encounter list</h1>
          </div>
          <Button asChild>
            <Link href="/visits/new">Create visit</Link>
          </Button>
        </div>
        <ul className="mt-8 space-y-3">
          {visits.map((visit) => (
            <li key={visit.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-card p-4 shadow-[var(--shadow-border)]">
              <div>
                <p className="font-medium">
                  {visit.individual.displayName}
                  {visit.individual.synthetic && (
                    <Badge className="ml-2" tone="warn">
                      SYNTHETIC
                    </Badge>
                  )}
                </p>
                <p className="font-mono text-xs text-muted">
                  {formatDateTime(visit.scheduledAt)} · {visit.visitType.replaceAll("_", " ")} · {visit.status}
                  {visit.notes.some((n) => n.status === "DRAFT") ? " · draft note" : ""}
                  {visit.notes.some((n) => n.status === "LOCKED") ? " · locked note" : ""}
                </p>
              </div>
              <Button asChild size="sm">
                <Link href={`/visits/${visit.id}`}>Open</Link>
              </Button>
            </li>
          ))}
        </ul>
      </main>
    </StaffShell>
  );
}
