import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { canAccessIndividual } from "@/lib/access";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { canReadNoteType, canWriteNotes } from "@/lib/roles";
import { jsonError, requireSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "text/plain",
]);

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    if (!canWriteNotes(user.role)) return jsonError("Forbidden", 403);

    const form = await request.formData();
    const noteId = String(form.get("noteId") ?? "");
    const file = form.get("file");
    if (!noteId || !(file instanceof File)) return jsonError("noteId and file are required", 400);

    const note = await prisma.visitNote.findUnique({
      where: { id: noteId },
      include: { visit: true },
    });
    if (!note) return jsonError("Note not found", 404);
    if (note.status === "LOCKED") return jsonError("Cannot attach files to a locked note", 409);
    if (!(await canAccessIndividual(user.id, user.role, note.visit.individualId))) {
      return jsonError("Forbidden", 403);
    }
    if (!canReadNoteType(user.role, user.credential, note.noteType)) {
      return jsonError("Note not found", 404);
    }
    if (user.role !== "ADMIN" && note.authorId !== user.id) {
      return jsonError("Only the author or an admin can attach files", 403);
    }
    if (file.size > MAX_BYTES) return jsonError("File too large", 413);
    if (!ALLOWED.has(file.type)) return jsonError("File type not allowed", 415);

    const dir = process.env.ATTACHMENT_DIR ?? "./data/attachments";
    await mkdir(dir, { recursive: true });
    const storageKey = `${noteId}/${randomUUID()}`;
    const dest = path.join(dir, storageKey);
    await mkdir(path.dirname(dest), { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(dest, buffer);

    const attachment = await prisma.attachment.create({
      data: {
        visitNoteId: noteId,
        uploadedById: user.id,
        fileName: file.name.replace(/[^\w.\- ()]/g, "_").slice(0, 180),
        mimeType: file.type,
        byteSize: file.size,
        storageKey,
      },
    });

    await writeAudit({
      actorId: user.id,
      action: "ATTACHMENT_CREATE",
      entityType: "attachment",
      entityId: attachment.id,
      metadata: { mimeType: attachment.mimeType, byteSize: attachment.byteSize },
    });

    return Response.json({
      attachment: {
        id: attachment.id,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        byteSize: attachment.byteSize,
        createdAt: attachment.createdAt,
      },
    }, { status: 201 });
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    return jsonError(status === 401 ? "Unauthorized" : "Unable to store attachment", status);
  }
}
