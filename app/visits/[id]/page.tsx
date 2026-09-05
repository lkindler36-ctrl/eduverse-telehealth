import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { canAccessIndividual } from "@/lib/access";
import { writeAudit } from "@/lib/audit";
import { allowedNoteTypes, canCreateVisit, canWriteNotes, defaultNoteType } from "@/lib/roles";
import { requireStaff } from "@/lib/staff-page";
import { formatDateTime } from "@/lib/utils";
import { StaffShell } from "@/components/staff-shell";
import { StartNoteButton } from "@/components/start-note-button";
import { VisitStatusForm } from "@/components/visit-status-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function VisitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaff();
  const { id } = await params;
  const visit = await prisma.visit.findUnique({
    where: { id },
    include: {
      individual: true,
      clinician: { select: { id: true, name: true } },
      notes: {
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!visit) notFound();
  if (!(await canAccessIndividual(user.id, user.role, visit.individualId))) notFound();

  await writeAudit({
    actorId: user.id,
    action: "VISIT_VIEW",
    entityType: "visit",
    entityId: visit.id,
  });

  const noteTypes = allowedNoteTypes(user.role, user.credential);
  const suggested = defaultNoteType(visit.visitType);

  return (
    <StaffShell user={user} pathname="/visits">
      <main className="mx-auto max-w-6xl px-4 py-10">
        <p className="font-mono text-xs uppercase tracking-widest text-care">Visit</p>
        <h1 className="mt-2 flex flex-wrap items-center gap-3 font-display text-4xl">
          {visit.individual.displayName}
          {visit.individual.synthetic && <Badge tone="warn">SYNTHETIC</Badge>}
        </h1>
        <p className="mt-3 text-muted">
          {visit.visitType.replaceAll("_", " ")} · {formatDateTime(visit.scheduledAt)} · {visit.clinician.name}
        </p>
        <p className="mt-2 max-w-2xl text-sm text-muted">{visit.reason}</p>
        {visit.locationNote && (
          <p className="mt-1 text-sm text-subtle">{visit.locationNote}</p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href={`/individuals/${visit.individualId}`}>Chart</Link>
          </Button>
        </div>

        {canCreateVisit(user.role) && (user.role === "ADMIN" || visit.clinicianId === user.id) && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Visit status</CardTitle>
              <CardDescription>Mark in progress or complete independently of note lock.</CardDescription>
            </CardHeader>
            <CardContent>
              <VisitStatusForm visitId={visit.id} status={visit.status} />
            </CardContent>
          </Card>
        )}

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Notes</CardTitle>
            <CardDescription>
              Sign and lock when the encounter documentation is complete.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {canWriteNotes(user.role) && noteTypes.includes(suggested) && (
              <StartNoteButton visitId={visit.id} noteType={suggested} />
            )}
            {visit.notes.length === 0 && <p className="text-sm text-muted">No notes yet.</p>}
            {visit.notes.map((note) => (
              <div key={note.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-elevated p-3">
                <div>
                  <p className="text-sm font-medium">
                    {note.noteType.replaceAll("_", " ")} · {note.status}
                  </p>
                  <p className="font-mono text-xs text-muted">
                    {note.author.name} · updated {formatDateTime(note.updatedAt)}
                  </p>
                </div>
                <Button asChild size="sm">
                  <Link href={`/visits/${visit.id}/notes/${note.id}`}>
                    {note.status === "LOCKED" ? "View" : "Document"}
                  </Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </StaffShell>
  );
}
