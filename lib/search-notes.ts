import type { NoteType, Prisma } from "@prisma/client";

const NOTE_FIELD_PATHS = [
  ["subjective"],
  ["objective"],
  ["assessment"],
  ["plan"],
  ["presentation"],
  ["interventions"],
  ["response"],
  ["risk"],
  ["supports"],
  ["adls"],
  ["incidents"],
  ["narrative"],
] as const;

export function noteTypeFromQuery(q: string): NoteType | undefined {
  const n = q.trim().toUpperCase().replace(/\s+/g, "_");
  if (n === "SOAP" || n === "BH_PROGRESS" || n === "DSP_SHIFT") return n;
  if (n === "BH" || n === "PROGRESS") return "BH_PROGRESS";
  if (n === "DSP" || n === "SHIFT") return "DSP_SHIFT";
  return undefined;
}

export function noteQueryFilter(q: string): Prisma.VisitNoteWhereInput {
  const typeMatch = noteTypeFromQuery(q);
  const fieldMatches: Prisma.VisitNoteWhereInput[] = NOTE_FIELD_PATHS.map((path) => ({
    content: { path: [...path], string_contains: q },
  }));
  return {
    OR: [
      { visit: { individual: { displayName: { contains: q, mode: "insensitive" } } } },
      { visit: { individual: { preferredName: { contains: q, mode: "insensitive" } } } },
      { visit: { reason: { contains: q, mode: "insensitive" } } },
      ...(typeMatch ? [{ noteType: typeMatch }] : []),
      ...fieldMatches,
    ],
  };
}
