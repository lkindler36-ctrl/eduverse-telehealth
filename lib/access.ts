import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function canAccessIndividual(userId: string, role: Role, individualId: string) {
  if (role === "ADMIN" || role === "AUDITOR") return true;
  const assignment = await prisma.caseloadAssignment.findUnique({
    where: { clinicianId_individualId: { clinicianId: userId, individualId } },
    select: { id: true },
  });
  return Boolean(assignment);
}

export async function assignedIndividualIds(userId: string, role: Role) {
  if (role === "ADMIN" || role === "AUDITOR") {
    const rows = await prisma.individual.findMany({
      where: { active: true },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }
  const rows = await prisma.caseloadAssignment.findMany({
    where: { clinicianId: userId },
    select: { individualId: true },
  });
  return rows.map((r) => r.individualId);
}
