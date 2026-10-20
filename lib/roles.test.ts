import assert from "node:assert/strict";
import { test } from "node:test";
import { allowedNoteTypes, canReadNoteType, canViewAudit, canWriteNotes, readableNoteTypes } from "./roles";

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

test("DSP cannot read SOAP or BH notes", () => {
  assert.deepEqual(readableNoteTypes("DSP", null), ["DSP_SHIFT"]);
  assert.equal(canReadNoteType("DSP", null, "SOAP"), false);
  assert.equal(canReadNoteType("DSP", null, "BH_PROGRESS"), false);
  assert.equal(canReadNoteType("DSP", null, "DSP_SHIFT"), true);
});

test("clinician reads SOAP/BH but not DSP shift notes", () => {
  assert.equal(canReadNoteType("CLINICIAN", "RN", "SOAP"), true);
  assert.equal(canReadNoteType("CLINICIAN", "RN", "DSP_SHIFT"), false);
});

test("auditor can read every note type", () => {
  assert.deepEqual(readableNoteTypes("AUDITOR", null), ["SOAP", "BH_PROGRESS", "DSP_SHIFT"]);
});
