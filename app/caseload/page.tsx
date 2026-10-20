import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { assignedIndividualIds } from "@/lib/access";
import { requireStaff } from "@/lib/staff-page";
import { formatDateTime } from "@/lib/utils";
import { StaffShell } from "@/components/staff-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function CaseloadPage() {
  const user = await requireStaff();
  const ids = await assignedIndividualIds(user.id, user.role);
  const individuals = await prisma.individual.findMany({
    where: { id: { in: ids }, active: true },
    include: {
      visits: { orderBy: { scheduledAt: "desc" }, take: 1 },
    },
    orderBy: { displayName: "asc" },
  });

  return (
    <StaffShell user={user} pathname="/caseload">
      <main className="mx-auto max-w-6xl px-4 py-10">
        <p className="font-mono text-xs uppercase tracking-widest text-care">Caseload</p>
        <h1 className="mt-2 font-display text-4xl">Individuals served</h1>
        <p className="mt-3 max-w-2xl text-muted">
          Minimal identifiers only. Seed people are labeled SYNTHETIC.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {individuals.map((ind) => (
            <Card key={ind.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {ind.displayName}
                  {ind.synthetic && <Badge tone="warn">SYNTHETIC</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted">
                <p>{ind.program ?? "Program not listed"} · {ind.county ?? "County n/a"}</p>
                {ind.visits[0] && (
                  <p>Last visit {formatDateTime(ind.visits[0].scheduledAt)}</p>
                )}
                <Button asChild size="sm">
                  <Link href={`/individuals/${ind.id}`}>Open chart</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </StaffShell>
  );
}
