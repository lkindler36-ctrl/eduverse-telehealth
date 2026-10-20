import { z } from "zod";

export const visitCreateSchema = z.object({
  individualId: z.string().min(1),
  visitType: z.enum(["MEDICAL", "BEHAVIORAL_HEALTH", "DSP_SHIFT"]),
  modality: z.enum(["TELEHEALTH", "IN_PERSON", "SHIFT"]).optional(),
  scheduledAt: z.string().min(1),
  reason: z.string().trim().min(1).max(500),
  locationNote: z.string().trim().max(200).optional(),
});

export const visitUpdateSchema = z.object({
  status: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  scheduledAt: z.string().min(1).optional(),
  reason: z.string().trim().min(1).max(500).optional(),
  locationNote: z.string().trim().max(200).optional().nullable(),
  startedAt: z.string().optional().nullable(),
  endedAt: z.string().optional().nullable(),
});

export const soapContentSchema = z.object({
  subjective: z.string().max(8000).optional().default(""),
  objective: z.string().max(8000).optional().default(""),
  assessment: z.string().max(8000).optional().default(""),
  plan: z.string().max(8000).optional().default(""),
});

export const bhContentSchema = z.object({
  presentation: z.string().max(8000).optional().default(""),
  interventions: z.string().max(8000).optional().default(""),
  response: z.string().max(8000).optional().default(""),
  risk: z.string().max(8000).optional().default(""),
  plan: z.string().max(8000).optional().default(""),
});

export const dspContentSchema = z.object({
  shiftStart: z.string().max(40).optional().default(""),
  shiftEnd: z.string().max(40).optional().default(""),
  supports: z.string().max(8000).optional().default(""),
  adls: z.string().max(8000).optional().default(""),
  incidents: z.string().max(8000).optional().default(""),
  narrative: z.string().max(8000).optional().default(""),
});

export function parseNoteContent(noteType: "SOAP" | "BH_PROGRESS" | "DSP_SHIFT", raw: unknown) {
  if (noteType === "SOAP") return soapContentSchema.parse(raw ?? {});
  if (noteType === "BH_PROGRESS") return bhContentSchema.parse(raw ?? {});
  return dspContentSchema.parse(raw ?? {});
}

export const noteCreateSchema = z.object({
  visitId: z.string().min(1),
  noteType: z.enum(["SOAP", "BH_PROGRESS", "DSP_SHIFT"]),
  content: z.unknown().optional(),
});

export const noteUpdateSchema = z.object({
  content: z.unknown(),
});

export const searchSchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  visitStatus: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  noteStatus: z.enum(["DRAFT", "LOCKED"]).optional(),
});

export type SoapContent = z.infer<typeof soapContentSchema>;
export type BhContent = z.infer<typeof bhContentSchema>;
export type DspContent = z.infer<typeof dspContentSchema>;
export type NoteContent = SoapContent | BhContent | DspContent;
