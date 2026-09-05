import { prisma } from "@/lib/prisma";
import { canViewAudit } from "@/lib/roles";
import { jsonError, requireSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireSessionUser();
    if (!canViewAudit(user.role)) return jsonError("Forbidden", 403);

    const url = new URL(request.url);
    const entityType = url.searchParams.get("entityType") ?? undefined;
    const entityId = url.searchParams.get("entityId") ?? undefined;
    const action = url.searchParams.get("action") ?? undefined;
    const take = Math.min(Number(url.searchParams.get("take") ?? 100), 200);

    const events = await prisma.auditLog.findMany({
      where: {
        ...(entityType ? { entityType } : {}),
        ...(entityId ? { entityId } : {}),
        ...(action ? { action: action as never } : {}),
      },
      include: { actor: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: "desc" },
      take,
    });

    return Response.json({ events });
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    return jsonError(status === 401 ? "Unauthorized" : "Unable to query audit trail", status);
  }
}
