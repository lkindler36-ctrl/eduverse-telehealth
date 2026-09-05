import assert from "node:assert/strict";
import { test } from "node:test";
import { noteQueryFilter, noteTypeFromQuery } from "./search-notes";

test("note search applies q to individual name and note fields", () => {
  const filter = noteQueryFilter("Jane");
  assert.ok(filter.OR);
  assert.ok(JSON.stringify(filter).includes("Jane"));
  assert.ok(JSON.stringify(filter).includes("displayName"));
  assert.ok(JSON.stringify(filter).includes("subjective"));
});

test("note search recognizes note type tokens", () => {
  assert.equal(noteTypeFromQuery("soap"), "SOAP");
  assert.equal(noteTypeFromQuery("dsp"), "DSP_SHIFT");
});
