import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { canAccessIndividual } from "@/lib/access";
import { writeAudit } from "@/lib/audit";
import { requireStaff } from "@/lib/staff-page";
import { formatDate, formatDateTime } from "@/lib/utils";
import { StaffShell } from "@/components/staff-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function IndividualPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaff();
  const { id } = await params;
  if (!(await canAccessIndividual(user.id, user.role, id))) notFound();

  const individual = await prisma.individual.findUnique({
    where: { id },
    include: {
      visits: {
        include: { notes: { select: { id: true, status: true, noteType: true } } },
        orderBy: { scheduledAt: "desc" },
      },
    },
  });
  if (!individual) notFound();

  await writeAudit({
    actorId: user.id,
    action: "INDIVIDUAL_VIEW",
    entityType: "individual",
    entityId: individual.id,
  });

  return (
    <StaffShell user={user} pathname="/caseload">
      <main className="mx-auto max-w-6xl px-4 py-10">
        <p className="font-mono text-xs uppercase tracking-widest text-care">Individual</p>
        <h1 className="mt-2 flex flex-wrap items-center gap-3 font-display text-4xl">
          {individual.displayName}
          {individual.synthetic && <Badge tone="warn">SYNTHETIC</Badge>}
        </h1>
        <p className="mt-3 text-muted">
          {individual.program} · {individual.county}
          {individual.dateOfBirth ? ` · DOB ${formatDate(individual.dateOfBirth)}` : ""}
          {individual.recordLast4 ? ` · record …${individual.recordLast4}` : ""}
        </p>
        <div className="mt-6">
          <Button asChild>
            <Link href={`/visits/new?individualId=${individual.id}`}>Create visit</Link>
          </Button>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Visits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {individual.visits.map((visit) => (
              <div key={visit.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-elevated p-3">
                <div>
                  <p className="text-sm font-medium">
                    {visit.visitType.replaceAll("_", " ")} · {visit.status}
                  </p>
                  <p className="font-mono text-xs text-muted">{formatDateTime(visit.scheduledAt)}</p>
                </div>
                <Button asChild size="sm">
                  <Link href={`/visits/${visit.id}`}>Open visit</Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </StaffShell>
  );
}
