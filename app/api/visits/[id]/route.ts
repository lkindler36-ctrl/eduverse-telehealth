import { canAccessIndividual } from "@/lib/access";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { canCreateVisit } from "@/lib/roles";
import { jsonError, requireSessionUser } from "@/lib/session";
import { visitUpdateSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  try {
    const user = await requireSessionUser();
    const { id } = await ctx.params;
    const visit = await prisma.visit.findUnique({
      where: { id },
      include: {
        individual: true,
        clinician: { select: { id: true, name: true, role: true, credential: true } },
        notes: {
          include: { author: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!visit) return jsonError("Visit not found", 404);
    if (!(await canAccessIndividual(user.id, user.role, visit.individualId))) {
      return jsonError("Forbidden", 403);
    }
    await writeAudit({
      actorId: user.id,
      action: "VISIT_VIEW",
      entityType: "visit",
      entityId: visit.id,
    });
    return Response.json({ visit });
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    return jsonError(status === 401 ? "Unauthorized" : "Unable to load visit", status);
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const user = await requireSessionUser();
    if (!canCreateVisit(user.role)) return jsonError("Forbidden", 403);
    const { id } = await ctx.params;
    const existing = await prisma.visit.findUnique({ where: { id } });
    if (!existing) return jsonError("Visit not found", 404);
    if (!(await canAccessIndividual(user.id, user.role, existing.individualId))) {
      return jsonError("Forbidden", 403);
    }
    if (user.role !== "ADMIN" && existing.clinicianId !== user.id) {
      return jsonError("Only the assigned clinician or an admin can update this visit", 403);
    }

    const parsed = visitUpdateSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Invalid visit update", 400);

    const visit = await prisma.visit.update({
      where: { id },
      data: {
        status: parsed.data.status,
        reason: parsed.data.reason,
        locationNote: parsed.data.locationNote ?? undefined,
        scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : undefined,
        startedAt: parsed.data.startedAt === undefined
          ? undefined
          : parsed.data.startedAt
            ? new Date(parsed.data.startedAt)
            : null,
        endedAt: parsed.data.endedAt === undefined
          ? undefined
          : parsed.data.endedAt
            ? new Date(parsed.data.endedAt)
            : null,
      },
    });

    await writeAudit({
      actorId: user.id,
      action: "VISIT_UPDATE",
      entityType: "visit",
      entityId: visit.id,
      metadata: {
        fromStatus: existing.status,
        toStatus: visit.status,
        visitType: visit.visitType,
      },
    });

    return Response.json({ visit });
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    return jsonError(status === 401 ? "Unauthorized" : "Unable to update visit", status);
  }
}
