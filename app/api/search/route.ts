import { assignedIndividualIds } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { jsonError, requireSessionUser } from "@/lib/session";
import { searchSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireSessionUser();
    const url = new URL(request.url);
    const parsed = searchSchema.safeParse({
      q: url.searchParams.get("q") ?? "",
      visitStatus: url.searchParams.get("visitStatus") ?? undefined,
      noteStatus: url.searchParams.get("noteStatus") ?? undefined,
    });
    if (!parsed.success) return jsonError("Invalid search", 400);

    const ids = await assignedIndividualIds(user.id, user.role);
    const q = parsed.data.q;

    const individuals = await prisma.individual.findMany({
      where: {
        id: { in: ids },
        active: true,
        ...(q
          ? {
              OR: [
                { displayName: { contains: q, mode: "insensitive" } },
                { preferredName: { contains: q, mode: "insensitive" } },
                { program: { contains: q, mode: "insensitive" } },
                { recordLast4: q },
              ],
            }
          : {}),
      },
      take: 25,
      orderBy: { displayName: "asc" },
    });

    const visits = await prisma.visit.findMany({
      where: {
        individualId: { in: ids },
        ...(parsed.data.visitStatus ? { status: parsed.data.visitStatus } : {}),
        ...(q
          ? {
              OR: [
                { reason: { contains: q, mode: "insensitive" } },
                { individual: { displayName: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: {
        individual: { select: { id: true, displayName: true, synthetic: true } },
        clinician: { select: { id: true, name: true } },
      },
      orderBy: { scheduledAt: "desc" },
      take: 25,
    });

    const notes = await prisma.visitNote.findMany({
      where: {
        visit: { individualId: { in: ids } },
        ...(parsed.data.noteStatus ? { status: parsed.data.noteStatus } : {}),
      },
      include: {
        visit: {
          select: {
            id: true,
            scheduledAt: true,
            individual: { select: { id: true, displayName: true, synthetic: true } },
          },
        },
        author: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 25,
    });

    return Response.json({ individuals, visits, notes });
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    return jsonError(status === 401 ? "Unauthorized" : "Search failed", status);
  }
}
