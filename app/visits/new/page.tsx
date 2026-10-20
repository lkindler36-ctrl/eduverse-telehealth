import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { assignedIndividualIds } from "@/lib/access";
import { allowedVisitTypes, canCreateVisit } from "@/lib/roles";
import { requireStaff } from "@/lib/staff-page";
import { StaffShell } from "@/components/staff-shell";
import { CreateVisitForm } from "@/components/create-visit-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function NewVisitPage({
  searchParams,
}: {
  searchParams: Promise<{ individualId?: string }>;
}) {
  const user = await requireStaff();
  const { individualId } = await searchParams;
  const ids = await assignedIndividualIds(user.id, user.role);
  const individuals = await prisma.individual.findMany({
    where: { id: { in: ids }, active: true },
    select: { id: true, displayName: true, synthetic: true },
    orderBy: { displayName: "asc" },
  });

  return (
    <StaffShell user={user} pathname="/visits">
      <main className="mx-auto max-w-2xl px-4 py-10">
        <p className="font-mono text-xs uppercase tracking-widest text-care">New visit</p>
        <h1 className="mt-2 font-display text-4xl">Document an encounter</h1>
        <p className="mt-3 text-muted">
          Create the visit first, then write and lock the note. Zoom is only the video room.
        </p>
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Visit details</CardTitle>
            <CardDescription>
              {canCreateVisit(user.role)
                ? "Assigned individuals only."
                : "Your role is read-only."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {canCreateVisit(user.role) ? (
              <Suspense>
                <CreateVisitForm
                  individuals={individuals}
                  allowedTypes={allowedVisitTypes(user.role, user.credential)}
                  defaultIndividualId={individualId}
                />
              </Suspense>
            ) : (
              <p className="text-sm text-muted">Auditors cannot create visits.</p>
            )}
          </CardContent>
        </Card>
      </main>
    </StaffShell>
  );
}
