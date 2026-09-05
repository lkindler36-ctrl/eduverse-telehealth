import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { canAccessIndividual } from "@/lib/access";
import { writeAudit } from "@/lib/audit";
import { canWriteNotes } from "@/lib/roles";
import { requireStaff } from "@/lib/staff-page";
import { formatDateTime } from "@/lib/utils";
import { parseNoteContent } from "@/lib/validators";
import { StaffShell } from "@/components/staff-shell";
import { NoteForm } from "@/components/note-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function NotePage({
  params,
}: {
  params: Promise<{ id: string; noteId: string }>;
}) {
  const user = await requireStaff();
  const { id, noteId } = await params;
  const note = await prisma.visitNote.findUnique({
    where: { id: noteId },
    include: {
      visit: { include: { individual: true } },
      author: { select: { id: true, name: true } },
      signedBy: { select: { name: true } },
    },
  });
  if (!note || note.visitId !== id) notFound();
  if (!(await canAccessIndividual(user.id, user.role, note.visit.individualId))) notFound();

  await writeAudit({
    actorId: user.id,
    action: "NOTE_VIEW",
    entityType: "visit_note",
    entityId: note.id,
    metadata: { noteType: note.noteType, status: note.status },
  });

  const content = parseNoteContent(note.noteType, note.content);
  const canEdit =
    canWriteNotes(user.role) &&
    note.status === "DRAFT" &&
    (user.role === "ADMIN" || note.authorId === user.id);

  return (
    <StaffShell user={user} pathname="/visits">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <p className="font-mono text-xs uppercase tracking-widest text-care">
          <Link href={`/visits/${note.visitId}`} className="hover:underline">
            Back to visit
          </Link>
        </p>
        <h1 className="mt-2 flex flex-wrap items-center gap-3 font-display text-4xl">
          {note.noteType.replaceAll("_", " ")}
          <Badge tone={note.status === "LOCKED" ? "ok" : "care"}>{note.status}</Badge>
          {note.visit.individual.synthetic && <Badge tone="warn">SYNTHETIC</Badge>}
        </h1>
        <p className="mt-3 text-muted">
          {note.visit.individual.displayName} · {note.author.name} · {formatDateTime(note.updatedAt)}
        </p>
        {note.lockedAt && note.signedBy && (
          <p className="mt-1 text-sm text-ok">
            Signed and locked {formatDateTime(note.lockedAt)} by {note.signedBy.name}
          </p>
        )}

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Clinical documentation</CardTitle>
            <CardDescription>
              {note.status === "LOCKED"
                ? "This note is locked. Export PDF for the record."
                : "Save the draft, then sign and lock when complete."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NoteForm
              noteId={note.id}
              noteType={note.noteType}
              locked={note.status === "LOCKED"}
              canEdit={canEdit}
              initial={content as Record<string, string>}
            />
          </CardContent>
        </Card>
      </main>
    </StaffShell>
  );
}
