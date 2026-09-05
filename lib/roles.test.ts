import assert from "node:assert/strict";
import { test } from "node:test";
import { allowedNoteTypes, canViewAudit, canWriteNotes } from "./roles";

test("DSP can write DSP notes only", () => {
  assert.deepEqual(allowedNoteTypes("DSP", null), ["DSP_SHIFT"]);
  assert.equal(canWriteNotes("DSP"), true);
});

test("auditor is read-only for notes and can view audit", () => {
  assert.deepEqual(allowedNoteTypes("AUDITOR", null), []);
  assert.equal(canWriteNotes("AUDITOR"), false);
  assert.equal(canViewAudit("AUDITOR"), true);
});

test("BH clinician can write BH and SOAP notes", () => {
  assert.deepEqual(allowedNoteTypes("CLINICIAN", "BH"), ["BH_PROGRESS", "SOAP"]);
});
