import { assignedIndividualIds, canAccessIndividual } from "@/lib/access";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { canManageAssignments } from "@/lib/roles";
import { jsonError, requireSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireSessionUser();
    const ids = await assignedIndividualIds(user.id, user.role);
    const individuals = await prisma.individual.findMany({
      where: { id: { in: ids }, active: true },
      orderBy: { displayName: "asc" },
      include: {
        _count: { select: { visits: true } },
        visits: {
          orderBy: { scheduledAt: "desc" },
          take: 1,
          select: { id: true, scheduledAt: true, status: true, visitType: true },
        },
      },
    });
    return Response.json({ individuals });
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    return jsonError(status === 401 ? "Unauthorized" : "Unable to load caseload", status);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    if (!canManageAssignments(user.role)) return jsonError("Forbidden", 403);
    const body = (await request.json()) as { clinicianId?: string; individualId?: string };
    if (!body.clinicianId || !body.individualId) return jsonError("Missing assignment fields", 400);
    const row = await prisma.caseloadAssignment.upsert({
      where: {
        clinicianId_individualId: {
          clinicianId: body.clinicianId,
          individualId: body.individualId,
        },
      },
      update: {},
      create: { clinicianId: body.clinicianId, individualId: body.individualId },
    });
    return Response.json({ assignment: row }, { status: 201 });
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    return jsonError(status === 401 ? "Unauthorized" : "Unable to assign caseload", status);
  }
}

export async function PUT(request: Request) {
  // Used by individual chart to record a view through the API surface.
  try {
    const user = await requireSessionUser();
    const body = (await request.json()) as { individualId?: string };
    if (!body.individualId) return jsonError("individualId required", 400);
    const ok = await canAccessIndividual(user.id, user.role, body.individualId);
    if (!ok) return jsonError("Forbidden", 403);
    await writeAudit({
      actorId: user.id,
      action: "INDIVIDUAL_VIEW",
      entityType: "individual",
      entityId: body.individualId,
    });
    return Response.json({ ok: true });
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    return jsonError(status === 401 ? "Unauthorized" : "Unable to record view", status);
  }
}
