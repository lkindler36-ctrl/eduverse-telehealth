import type { ClinicianCredential, NoteType, Role, VisitType } from "@prisma/client";

export type StaffRole = Role;

export function canWriteNotes(role: Role) {
  return role === "ADMIN" || role === "CLINICIAN" || role === "DSP";
}

export function canLockNotes(role: Role) {
  return canWriteNotes(role);
}

export function canViewAudit(role: Role) {
  return role === "ADMIN" || role === "AUDITOR";
}

export function canManageAssignments(role: Role) {
  return role === "ADMIN";
}

export function canCreateVisit(role: Role) {
  return role === "ADMIN" || role === "CLINICIAN" || role === "DSP";
}

export function allowedNoteTypes(role: Role, credential: ClinicianCredential | null): NoteType[] {
  if (role === "ADMIN") return ["SOAP", "BH_PROGRESS", "DSP_SHIFT"];
  if (role === "DSP") return ["DSP_SHIFT"];
  if (role === "CLINICIAN") {
    if (credential === "BH") return ["BH_PROGRESS", "SOAP"];
    return ["SOAP", "BH_PROGRESS"];
  }
  return [];
}

export function allowedVisitTypes(role: Role, credential: ClinicianCredential | null): VisitType[] {
  if (role === "ADMIN") return ["MEDICAL", "BEHAVIORAL_HEALTH", "DSP_SHIFT"];
  if (role === "DSP") return ["DSP_SHIFT"];
  if (role === "CLINICIAN") {
    if (credential === "BH") return ["BEHAVIORAL_HEALTH", "MEDICAL"];
    return ["MEDICAL", "BEHAVIORAL_HEALTH"];
  }
  return [];
}

export function defaultNoteType(visitType: VisitType): NoteType {
  if (visitType === "BEHAVIORAL_HEALTH") return "BH_PROGRESS";
  if (visitType === "DSP_SHIFT") return "DSP_SHIFT";
  return "SOAP";
}

export function roleLabel(role: Role, credential: ClinicianCredential | null) {
  if (role === "ADMIN") return "Administrator";
  if (role === "AUDITOR") return "Read-only auditor";
  if (role === "DSP") return "DSP / CLS";
  if (credential) return `Clinician · ${credential}`;
  return "Clinician";
}
