import { canAccessIndividual } from "@/lib/access";
import { writeAudit } from "@/lib/audit";
import { renderNotePdf } from "@/lib/pdf";
import { prisma } from "@/lib/prisma";
import { canReadNoteType } from "@/lib/roles";
import { jsonError, requireSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  try {
    const user = await requireSessionUser();
    const { id } = await ctx.params;
    const note = await prisma.visitNote.findUnique({
      where: { id },
      include: {
        visit: { include: { individual: true, clinician: true } },
        author: true,
        signedBy: true,
      },
    });
    if (!note) return jsonError("Note not found", 404);
    if (!(await canAccessIndividual(user.id, user.role, note.visit.individualId))) {
      return jsonError("Forbidden", 403);
    }
    if (!canReadNoteType(user.role, user.credential, note.noteType)) {
      return jsonError("Note not found", 404);
    }

    const pdf = await renderNotePdf(note);
    await writeAudit({
      actorId: user.id,
      action: "NOTE_PDF",
      entityType: "visit_note",
      entityId: note.id,
      metadata: { noteType: note.noteType, status: note.status },
    });

    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="note-${note.id}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    return jsonError(status === 401 ? "Unauthorized" : "Unable to export PDF", status);
  }
}
