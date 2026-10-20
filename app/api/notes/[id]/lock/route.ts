import { canAccessIndividual } from "@/lib/access";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { canLockNotes, canReadNoteType } from "@/lib/roles";
import { jsonError, requireSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, ctx: Ctx) {
  try {
    const user = await requireSessionUser();
    if (!canLockNotes(user.role)) return jsonError("Forbidden", 403);
    const { id } = await ctx.params;
    const existing = await prisma.visitNote.findUnique({
      where: { id },
      include: { visit: true },
    });
    if (!existing) return jsonError("Note not found", 404);
    if (!(await canAccessIndividual(user.id, user.role, existing.visit.individualId))) {
      return jsonError("Forbidden", 403);
    }
    if (!canReadNoteType(user.role, user.credential, existing.noteType)) {
      return jsonError("Note not found", 404);
    }
    if (existing.status === "LOCKED") return jsonError("Note is already locked", 409);
    if (user.role !== "ADMIN" && existing.authorId !== user.id) {
      return jsonError("Only the author or an admin can lock this note", 403);
    }

    const now = new Date();
    const note = await prisma.visitNote.update({
      where: { id },
      data: {
        status: "LOCKED",
        lockedAt: now,
        signedAt: now,
        signedById: user.id,
      },
    });

    await prisma.visit.update({
      where: { id: existing.visitId },
      data: { status: "COMPLETED", endedAt: existing.visit.endedAt ?? now },
    });

    await writeAudit({
      actorId: user.id,
      action: "NOTE_LOCK",
      entityType: "visit_note",
      entityId: note.id,
      metadata: { noteType: note.noteType, fromStatus: "DRAFT", toStatus: "LOCKED" },
    });

    return Response.json({ note });
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    return jsonError(status === 401 ? "Unauthorized" : "Unable to lock note", status);
  }
}
