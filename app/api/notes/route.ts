import { canAccessIndividual } from "@/lib/access";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { allowedNoteTypes, canWriteNotes, defaultNoteType, noteTypeReadFilter } from "@/lib/roles";
import { jsonError, requireSessionUser } from "@/lib/session";
import { noteCreateSchema, parseNoteContent } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireSessionUser();
    const visitId = new URL(request.url).searchParams.get("visitId");
    if (!visitId) return jsonError("visitId required", 400);
    const visit = await prisma.visit.findUnique({ where: { id: visitId } });
    if (!visit) return jsonError("Visit not found", 404);
    if (!(await canAccessIndividual(user.id, user.role, visit.individualId))) {
      return jsonError("Forbidden", 403);
    }
    const notes = await prisma.visitNote.findMany({
      where: { visitId, ...noteTypeReadFilter(user.role, user.credential) },
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return Response.json({ notes });
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    return jsonError(status === 401 ? "Unauthorized" : "Unable to list notes", status);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    if (!canWriteNotes(user.role)) return jsonError("Forbidden", 403);
    const parsed = noteCreateSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Invalid note", 400);

    const visit = await prisma.visit.findUnique({ where: { id: parsed.data.visitId } });
    if (!visit) return jsonError("Visit not found", 404);
    if (!(await canAccessIndividual(user.id, user.role, visit.individualId))) {
      return jsonError("Forbidden", 403);
    }

    const allowed = allowedNoteTypes(user.role, user.credential);
    const noteType = parsed.data.noteType ?? defaultNoteType(visit.visitType);
    if (!allowed.includes(noteType)) return jsonError("Note type not allowed for this role", 403);

    const content = parseNoteContent(noteType, parsed.data.content);
    const note = await prisma.visitNote.create({
      data: {
        visitId: visit.id,
        authorId: user.id,
        noteType,
        content,
        status: "DRAFT",
      },
    });

    if (visit.status === "SCHEDULED") {
      await prisma.visit.update({
        where: { id: visit.id },
        data: { status: "IN_PROGRESS", startedAt: visit.startedAt ?? new Date() },
      });
    }

    await writeAudit({
      actorId: user.id,
      action: "NOTE_CREATE",
      entityType: "visit_note",
      entityId: note.id,
      metadata: { noteType, status: "DRAFT" },
    });

    return Response.json({ note }, { status: 201 });
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    return jsonError(status === 401 ? "Unauthorized" : "Unable to create note", status);
  }
}
