/**
 * Structured logger that refuses PHI-like keys.
 * Allowed fields: event, ids, counts, status codes, durations.
 */

const BLOCKED = new Set([
  "name",
  "displayName",
  "preferredName",
  "email",
  "password",
  "passwordHash",
  "subjective",
  "objective",
  "assessment",
  "plan",
  "presentation",
  "interventions",
  "response",
  "risk",
  "supports",
  "adls",
  "incidents",
  "narrative",
  "content",
  "reason",
  "dateOfBirth",
  "dob",
  "medicaid",
  "ssn",
  "note",
  "body",
  "token",
  "magicLink",
  "fileName",
]);

export type SafeLogFields = {
  event: string;
  actorId?: string;
  entityType?: string;
  entityId?: string;
  status?: number;
  count?: number;
  durationMs?: number;
  errorCode?: string;
};

function assertSafe(fields: Record<string, unknown>) {
  for (const key of Object.keys(fields)) {
    if (BLOCKED.has(key)) {
      throw new Error("Refusing to log a field that may contain PHI");
    }
  }
}

export function logInfo(fields: SafeLogFields) {
  assertSafe(fields);
  console.info(JSON.stringify({ level: "info", ...fields, ts: new Date().toISOString() }));
}

export function logError(fields: SafeLogFields) {
  assertSafe(fields);
  console.error(JSON.stringify({ level: "error", ...fields, ts: new Date().toISOString() }));
}
