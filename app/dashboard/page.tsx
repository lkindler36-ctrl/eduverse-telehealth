import Link from "next/link";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { assignedIndividualIds } from "@/lib/access";
import { requireStaff } from "@/lib/staff-page";
import { formatDateTime } from "@/lib/utils";
import { StaffShell } from "@/components/staff-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireStaff();
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") ?? "/dashboard";
  const ids = await assignedIndividualIds(user.id, user.role);

  const [caseloadCount, openVisits, draftNotes, recentVisits] = await Promise.all([
    prisma.individual.count({ where: { id: { in: ids }, active: true } }),
    prisma.visit.count({
      where: { individualId: { in: ids }, status: { in: ["SCHEDULED", "IN_PROGRESS"] } },
    }),
    prisma.visitNote.count({
      where: { visit: { individualId: { in: ids } }, status: "DRAFT" },
    }),
    prisma.visit.findMany({
      where: { individualId: { in: ids } },
      include: {
        individual: { select: { displayName: true, synthetic: true } },
        notes: { select: { id: true, status: true, noteType: true } },
      },
      orderBy: { scheduledAt: "desc" },
      take: 8,
    }),
  ]);

  return (
    <StaffShell user={user} pathname={pathname}>
      <main className="mx-auto max-w-6xl px-4 py-10">
        <p className="font-mono text-xs uppercase tracking-widest text-care">Today on the chart</p>
        <h1 className="mt-2 font-display text-4xl">Welcome back, {user.name.split(" ")[0]}</h1>
        <p className="mt-3 max-w-2xl text-muted">
          Open a visit, write the note, then sign and lock. Video is on Zoom Healthcare.
          Documentation stays here.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/visits/new">Create visit</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/caseload">Open caseload</Link>
          </Button>
        </div>

        <dl className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[
            [String(caseloadCount), "Individuals on caseload"],
            [String(openVisits), "Open visits"],
            [String(draftNotes), "Draft notes"],
          ].map(([n, l]) => (
            <div key={l} className="rounded-xl bg-card px-4 py-5 shadow-[var(--shadow-border)]">
              <dt className="text-xs text-muted">{l}</dt>
              <dd className="mt-1 font-display text-3xl tabular-nums">{n}</dd>
            </div>
          ))}
        </dl>

        <Card className="mt-10">
          <CardHeader>
            <CardTitle>Recent visits</CardTitle>
            <CardDescription>Live counts from Postgres — not demo placeholders.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentVisits.length === 0 && <p className="text-sm text-muted">No visits yet.</p>}
            {recentVisits.map((visit) => (
              <div key={visit.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-elevated p-3">
                <div>
                  <p className="text-sm font-medium">
                    {visit.individual.displayName}
                    {visit.individual.synthetic && (
                      <Badge className="ml-2" tone="warn">
                        SYNTHETIC
                      </Badge>
                    )}
                  </p>
                  <p className="font-mono text-xs text-muted">
                    {formatDateTime(visit.scheduledAt)} · {visit.visitType.replaceAll("_", " ")} · {visit.status}
                  </p>
                </div>
                <Button asChild size="sm">
                  <Link href={`/visits/${visit.id}`}>Open</Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </StaffShell>
  );
}
