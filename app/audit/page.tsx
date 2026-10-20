import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { canViewAudit } from "@/lib/roles";
import { requireStaff } from "@/lib/staff-page";
import { formatDateTime } from "@/lib/utils";
import { StaffShell } from "@/components/staff-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const user = await requireStaff();
  if (!canViewAudit(user.role)) redirect("/dashboard");

  const events = await prisma.auditLog.findMany({
    include: { actor: { select: { name: true, role: true } } },
    orderBy: { createdAt: "desc" },
    take: 150,
  });

  return (
    <StaffShell user={user} pathname="/audit">
      <main className="mx-auto max-w-6xl px-4 py-10">
        <p className="font-mono text-xs uppercase tracking-widest text-care">Audit trail</p>
        <h1 className="mt-2 font-display text-4xl">Who viewed or changed the chart</h1>
        <p className="mt-3 max-w-2xl text-muted">
          Entries store action, actor, and record ids only. Note text is never written here.
        </p>
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Recent events</CardTitle>
            <CardDescription>Also available at GET /api/audit</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="py-2 pr-3">When</th>
                  <th className="py-2 pr-3">Actor</th>
                  <th className="py-2 pr-3">Action</th>
                  <th className="py-2 pr-3">Entity</th>
                  <th className="py-2">Id</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-t border-border">
                    <td className="py-2 pr-3 font-mono text-xs">{formatDateTime(event.createdAt)}</td>
                    <td className="py-2 pr-3">{event.actor?.name ?? "system"}</td>
                    <td className="py-2 pr-3">{event.action}</td>
                    <td className="py-2 pr-3">{event.entityType}</td>
                    <td className="py-2 font-mono text-xs">{event.entityId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </main>
    </StaffShell>
  );
}
