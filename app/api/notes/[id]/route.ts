import { canAccessIndividual } from "@/lib/access";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { canWriteNotes } from "@/lib/roles";
import { jsonError, requireSessionUser } from "@/lib/session";
import { noteUpdateSchema, parseNoteContent } from "@/lib/validators";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function loadAccessibleNote(userId: string, role: "ADMIN" | "CLINICIAN" | "DSP" | "AUDITOR", id: string) {
  const note = await prisma.visitNote.findUnique({
    where: { id },
    include: {
      visit: { include: { individual: true, clinician: { select: { id: true, name: true } } } },
      author: { select: { id: true, name: true, role: true, credential: true } },
      signedBy: { select: { id: true, name: true } },
      attachments: { select: { id: true, fileName: true, mimeType: true, byteSize: true, createdAt: true } },
    },
  });
  if (!note) return { error: jsonError("Note not found", 404) as Response };
  if (!(await canAccessIndividual(userId, role, note.visit.individualId))) {
    return { error: jsonError("Forbidden", 403) as Response };
  }
  return { note };
}

export async function GET(_request: Request, ctx: Ctx) {
  try {
    const user = await requireSessionUser();
    const { id } = await ctx.params;
    const result = await loadAccessibleNote(user.id, user.role, id);
    if ("error" in result && result.error) return result.error;
    await writeAudit({
      actorId: user.id,
      action: "NOTE_VIEW",
      entityType: "visit_note",
      entityId: id,
      metadata: { noteType: result.note!.noteType, status: result.note!.status },
    });
    return Response.json({ note: result.note });
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    return jsonError(status === 401 ? "Unauthorized" : "Unable to load note", status);
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const user = await requireSessionUser();
    if (!canWriteNotes(user.role)) return jsonError("Forbidden", 403);
    const { id } = await ctx.params;
    const result = await loadAccessibleNote(user.id, user.role, id);
    if ("error" in result && result.error) return result.error;
    const existing = result.note!;
    if (existing.status === "LOCKED") return jsonError("Locked notes cannot be edited", 409);
    if (user.role !== "ADMIN" && existing.authorId !== user.id) {
      return jsonError("Only the author or an admin can edit this draft", 403);
    }

    const parsed = noteUpdateSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Invalid note update", 400);
    const content = parseNoteContent(existing.noteType, parsed.data.content);

    const note = await prisma.visitNote.update({
      where: { id },
      data: { content },
    });

    await writeAudit({
      actorId: user.id,
      action: "NOTE_UPDATE",
      entityType: "visit_note",
      entityId: note.id,
      metadata: { noteType: note.noteType, status: note.status },
    });

    return Response.json({ note });
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    return jsonError(status === 401 ? "Unauthorized" : "Unable to update note", status);
  }
}
