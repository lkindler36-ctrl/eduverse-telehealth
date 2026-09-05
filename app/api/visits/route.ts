import { assignedIndividualIds, canAccessIndividual } from "@/lib/access";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { allowedVisitTypes, canCreateVisit } from "@/lib/roles";
import { jsonError, requireSessionUser } from "@/lib/session";
import { visitCreateSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireSessionUser();
    const url = new URL(request.url);
    const individualId = url.searchParams.get("individualId") ?? undefined;
    const ids = await assignedIndividualIds(user.id, user.role);

    const visits = await prisma.visit.findMany({
      where: {
        individualId: individualId ? individualId : { in: ids },
        ...(individualId ? { individualId } : {}),
      },
      include: {
        individual: { select: { id: true, displayName: true, synthetic: true, program: true } },
        clinician: { select: { id: true, name: true, credential: true, role: true } },
        notes: { select: { id: true, noteType: true, status: true, updatedAt: true } },
      },
      orderBy: { scheduledAt: "desc" },
      take: 100,
    });

    if (individualId && !(await canAccessIndividual(user.id, user.role, individualId))) {
      return jsonError("Forbidden", 403);
    }

    return Response.json({ visits });
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    return jsonError(status === 401 ? "Unauthorized" : "Unable to list visits", status);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    if (!canCreateVisit(user.role)) return jsonError("Forbidden", 403);
    const parsed = visitCreateSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Invalid visit", 400);

    const allowed = allowedVisitTypes(user.role, user.credential);
    if (!allowed.includes(parsed.data.visitType)) return jsonError("Visit type not allowed for this role", 403);
    if (!(await canAccessIndividual(user.id, user.role, parsed.data.individualId))) {
      return jsonError("Individual is not on your caseload", 403);
    }

    const visit = await prisma.visit.create({
      data: {
        individualId: parsed.data.individualId,
        clinicianId: user.id,
        visitType: parsed.data.visitType,
        modality: parsed.data.modality ?? (parsed.data.visitType === "DSP_SHIFT" ? "SHIFT" : "TELEHEALTH"),
        scheduledAt: new Date(parsed.data.scheduledAt),
        reason: parsed.data.reason,
        locationNote: parsed.data.locationNote,
        status: "SCHEDULED",
      },
    });

    await writeAudit({
      actorId: user.id,
      action: "VISIT_CREATE",
      entityType: "visit",
      entityId: visit.id,
      metadata: { visitType: visit.visitType, status: visit.status },
    });

    return Response.json({ visit }, { status: 201 });
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    return jsonError(status === 401 ? "Unauthorized" : "Unable to create visit", status);
  }
}
