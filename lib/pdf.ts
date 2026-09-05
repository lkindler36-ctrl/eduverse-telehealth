import PDFDocument from "pdfkit";
import type { Individual, User, Visit, VisitNote } from "@prisma/client";
import { parseNoteContent } from "@/lib/validators";
import { formatDateTime } from "@/lib/utils";

type NoteWithRelations = VisitNote & {
  visit: Visit & { individual: Individual; clinician: User };
  author: User;
  signedBy: User | null;
};

function collectLines(note: NoteWithRelations): Array<[string, string]> {
  const content = parseNoteContent(note.noteType, note.content);
  if (note.noteType === "SOAP") {
    const c = content as { subjective: string; objective: string; assessment: string; plan: string };
    return [
      ["Subjective", c.subjective],
      ["Objective", c.objective],
      ["Assessment", c.assessment],
      ["Plan", c.plan],
    ];
  }
  if (note.noteType === "BH_PROGRESS") {
    const c = content as {
      presentation: string;
      interventions: string;
      response: string;
      risk: string;
      plan: string;
    };
    return [
      ["Presentation / MSE", c.presentation],
      ["Interventions", c.interventions],
      ["Response", c.response],
      ["Risk", c.risk],
      ["Plan", c.plan],
    ];
  }
  const c = content as {
    shiftStart: string;
    shiftEnd: string;
    supports: string;
    adls: string;
    incidents: string;
    narrative: string;
  };
  return [
    ["Shift start", c.shiftStart],
    ["Shift end", c.shiftEnd],
    ["Supports provided", c.supports],
    ["ADLs / IADLs", c.adls],
    ["Incidents", c.incidents],
    ["Narrative", c.narrative],
  ];
}

export function renderNotePdf(note: NoteWithRelations): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 56 });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fillColor("#1f4a46").fontSize(18).text("EduVerse TeleHealth");
    doc.fillColor("#1a1c1a").fontSize(10).text("Von & Bick Healthcare Associates, LLC");
    doc.text("2133 Lawrenceville-Suwanee Rd, Suwanee, GA 30024 · 470-256-3897");
    doc.moveDown(0.6);
    doc.strokeColor("#1f4a46").lineWidth(1).moveTo(56, doc.y).lineTo(556, doc.y).stroke();
    doc.moveDown(0.8);

    doc.fontSize(14).text(`${note.noteType.replace("_", " ")} note`);
    doc.fontSize(10).fillColor("#5c605c");
    doc.text(`Note ID: ${note.id}`);
    doc.text(`Visit ID: ${note.visitId}`);
    doc.text(`Individual: ${note.visit.individual.displayName}${note.visit.individual.synthetic ? " (SYNTHETIC)" : ""}`);
    doc.text(`Visit scheduled: ${formatDateTime(note.visit.scheduledAt)}`);
    doc.text(`Author: ${note.author.name}`);
    doc.text(`Status: ${note.status}`);
    if (note.lockedAt && note.signedBy) {
      doc.text(`Signed / locked: ${formatDateTime(note.lockedAt)} by ${note.signedBy.name}`);
    }
    doc.moveDown();
    doc.fillColor("#1a1c1a");

    for (const [label, value] of collectLines(note)) {
      doc.fontSize(11).fillColor("#1f4a46").text(label);
      doc.fontSize(10).fillColor("#1a1c1a").text(value?.trim() ? value : "—", { width: 500 });
      doc.moveDown(0.5);
    }

    doc.moveDown();
    doc.fontSize(8).fillColor("#7a7e7a").text(
      "Video for this encounter is on Zoom Healthcare (BAA). This document is the legal chart note. Production PHI use requires approved BAAs and infrastructure controls.",
      { width: 500 },
    );

    doc.end();
  });
}
