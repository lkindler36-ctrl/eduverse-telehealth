import type { AuditAction, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/logger";

const META_ALLOW = new Set([
  "noteType",
  "visitType",
  "status",
  "fromStatus",
  "toStatus",
  "byteSize",
  "mimeType",
]);

export function sanitizeAuditMetadata(
  metadata?: Record<string, unknown> | null,
): Prisma.InputJsonValue | undefined {
  if (!metadata) return undefined;
  const clean: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (!META_ALLOW.has(key)) continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      clean[key] = value;
    }
  }
  return Object.keys(clean).length ? clean : undefined;
}

export async function writeAudit(input: {
  actorId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown> | null;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: sanitizeAuditMetadata(input.metadata) ?? undefined,
      },
    });
  } catch {
    logError({ event: "audit_write_failed", entityType: input.entityType, entityId: input.entityId });
  }
}
