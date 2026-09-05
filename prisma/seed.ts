import { PrismaClient, type Prisma } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const SEED_PASSWORD = "ChangeMe!2026";

async function main() {
  const passwordHash = await hash(SEED_PASSWORD, 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@vbhealthcare.local" },
    update: { passwordHash, active: true },
    create: {
      email: "admin@vbhealthcare.local",
      name: "Riley Admin",
      passwordHash,
      role: "ADMIN",
    },
  });

  const rn = await prisma.user.upsert({
    where: { email: "rn.demo@vbhealthcare.local" },
    update: { passwordHash, active: true, credential: "RN" },
    create: {
      email: "rn.demo@vbhealthcare.local",
      name: "Jordan Hale, RN",
      passwordHash,
      role: "CLINICIAN",
      credential: "RN",
    },
  });

  const bh = await prisma.user.upsert({
    where: { email: "bh.demo@vbhealthcare.local" },
    update: { passwordHash, active: true, credential: "BH" },
    create: {
      email: "bh.demo@vbhealthcare.local",
      name: "Casey Nguyen, LPC",
      passwordHash,
      role: "CLINICIAN",
      credential: "BH",
    },
  });

  const dsp = await prisma.user.upsert({
    where: { email: "dsp.demo@vbhealthcare.local" },
    update: { passwordHash, active: true },
    create: {
      email: "dsp.demo@vbhealthcare.local",
      name: "Morgan Ellis, DSP",
      passwordHash,
      role: "DSP",
    },
  });

  const auditor = await prisma.user.upsert({
    where: { email: "auditor.demo@vbhealthcare.local" },
    update: { passwordHash, active: true },
    create: {
      email: "auditor.demo@vbhealthcare.local",
      name: "Quinn Auditor",
      passwordHash,
      role: "AUDITOR",
    },
  });

  const jane = await prisma.individual.upsert({
    where: { id: "ind_jane_demo" },
    update: {},
    create: {
      id: "ind_jane_demo",
      displayName: "Jane Demo",
      preferredName: "Jane",
      dateOfBirth: new Date("1985-03-12T00:00:00.000Z"),
      recordLast4: "2401",
      program: "COMP Waiver · SYNTHETIC",
      county: "Gwinnett",
      synthetic: true,
    },
  });

  const john = await prisma.individual.upsert({
    where: { id: "ind_john_demo" },
    update: {},
    create: {
      id: "ind_john_demo",
      displayName: "John Demo",
      preferredName: "John",
      dateOfBirth: new Date("1978-11-04T00:00:00.000Z"),
      recordLast4: "8814",
      program: "NOW Waiver · SYNTHETIC",
      county: "Fulton",
      synthetic: true,
    },
  });

  const alex = await prisma.individual.upsert({
    where: { id: "ind_alex_demo" },
    update: {},
    create: {
      id: "ind_alex_demo",
      displayName: "Alex Demo",
      preferredName: "Alex",
      dateOfBirth: new Date("1992-07-21T00:00:00.000Z"),
      recordLast4: "5530",
      program: "Behavioral Health · SYNTHETIC",
      county: "DeKalb",
      synthetic: true,
    },
  });

  const assignments = [
    { clinicianId: rn.id, individualId: jane.id },
    { clinicianId: rn.id, individualId: john.id },
    { clinicianId: bh.id, individualId: alex.id },
    { clinicianId: bh.id, individualId: jane.id },
    { clinicianId: dsp.id, individualId: jane.id },
    { clinicianId: dsp.id, individualId: john.id },
  ];

  for (const row of assignments) {
    await prisma.caseloadAssignment.upsert({
      where: {
        clinicianId_individualId: {
          clinicianId: row.clinicianId,
          individualId: row.individualId,
        },
      },
      update: {},
      create: row,
    });
  }

  const soapVisit = await prisma.visit.upsert({
    where: { id: "vis_jane_soap" },
    update: {},
    create: {
      id: "vis_jane_soap",
      individualId: jane.id,
      clinicianId: rn.id,
      visitType: "MEDICAL",
      status: "COMPLETED",
      modality: "TELEHEALTH",
      scheduledAt: new Date("2026-08-28T14:00:00.000Z"),
      startedAt: new Date("2026-08-28T14:05:00.000Z"),
      endedAt: new Date("2026-08-28T14:32:00.000Z"),
      reason: "SYNTHETIC: 30-day telehealth follow-up for hypertension education",
      locationNote: "Zoom Healthcare (video only)",
    },
  });

  const bhVisit = await prisma.visit.upsert({
    where: { id: "vis_alex_bh" },
    update: {},
    create: {
      id: "vis_alex_bh",
      individualId: alex.id,
      clinicianId: bh.id,
      visitType: "BEHAVIORAL_HEALTH",
      status: "IN_PROGRESS",
      modality: "TELEHEALTH",
      scheduledAt: new Date("2026-09-05T15:30:00.000Z"),
      startedAt: new Date("2026-09-05T15:32:00.000Z"),
      reason: "SYNTHETIC: weekly BH progress session",
      locationNote: "Zoom Healthcare (video only)",
    },
  });

  const dspVisit = await prisma.visit.upsert({
    where: { id: "vis_john_dsp" },
    update: {},
    create: {
      id: "vis_john_dsp",
      individualId: john.id,
      clinicianId: dsp.id,
      visitType: "DSP_SHIFT",
      status: "SCHEDULED",
      modality: "SHIFT",
      scheduledAt: new Date("2026-09-05T12:00:00.000Z"),
      reason: "SYNTHETIC: community support shift notes",
      locationNote: "Community / in-home CLS",
    },
  });

  const lockedSoap: Prisma.InputJsonValue = {
    subjective: "SYNTHETIC: Jane reports taking morning antihypertensives most days and walking 15 minutes after dinner.",
    objective: "SYNTHETIC: Home BP log 128–136 / 78–84. No acute distress on video. Speech clear.",
    assessment: "SYNTHETIC: Hypertension education follow-up. Adherence improving. No red-flag symptoms reported.",
    plan: "SYNTHETIC: Continue current plan. RN to check BP log next visit. Call 911 for chest pain or sudden neuro change.",
  };

  await prisma.visitNote.upsert({
    where: { id: "note_jane_soap_locked" },
    update: {},
    create: {
      id: "note_jane_soap_locked",
      visitId: soapVisit.id,
      authorId: rn.id,
      noteType: "SOAP",
      status: "LOCKED",
      content: lockedSoap,
      signedAt: new Date("2026-08-28T14:35:00.000Z"),
      signedById: rn.id,
      lockedAt: new Date("2026-08-28T14:35:00.000Z"),
    },
  });

  const draftBh: Prisma.InputJsonValue = {
    presentation: "SYNTHETIC: Alex arrives on video, affect restricted, reports increased worry about work schedule.",
    interventions: "SYNTHETIC: Reviewed grounding skills and sleep routine. Reinforced safety plan already on file.",
    response: "SYNTHETIC: Engaged, able to list two coping steps to use tonight.",
    risk: "SYNTHETIC: Denies SI/HI. No new safety concerns reported this session.",
    plan: "SYNTHETIC: Continue weekly telehealth. Draft — not yet signed.",
  };

  await prisma.visitNote.upsert({
    where: { id: "note_alex_bh_draft" },
    update: {},
    create: {
      id: "note_alex_bh_draft",
      visitId: bhVisit.id,
      authorId: bh.id,
      noteType: "BH_PROGRESS",
      status: "DRAFT",
      content: draftBh,
    },
  });

  const draftDsp: Prisma.InputJsonValue = {
    shiftStart: "2026-09-05T12:00",
    shiftEnd: "2026-09-05T20:00",
    supports: "SYNTHETIC: Community outing planning and medication-reminder prompts (self-admin).",
    adls: "SYNTHETIC: Independent with hygiene. Needed verbal cues for meal prep sequence.",
    incidents: "SYNTHETIC: None.",
    narrative: "SYNTHETIC: Draft shift note — complete and lock at end of shift.",
  };

  await prisma.visitNote.upsert({
    where: { id: "note_john_dsp_draft" },
    update: {},
    create: {
      id: "note_john_dsp_draft",
      visitId: dspVisit.id,
      authorId: dsp.id,
      noteType: "DSP_SHIFT",
      status: "DRAFT",
      content: draftDsp,
    },
  });

  await prisma.auditLog.createMany({
    data: [
      {
        actorId: rn.id,
        action: "NOTE_LOCK",
        entityType: "visit_note",
        entityId: "note_jane_soap_locked",
        metadata: { noteType: "SOAP", toStatus: "LOCKED" },
      },
      {
        actorId: bh.id,
        action: "NOTE_CREATE",
        entityType: "visit_note",
        entityId: "note_alex_bh_draft",
        metadata: { noteType: "BH_PROGRESS", status: "DRAFT" },
      },
    ],
  });

  void auditor;
  void admin;
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(JSON.stringify({ event: "seed_failed", errorCode: "SEED" }));
    await prisma.$disconnect();
    throw error;
  });
