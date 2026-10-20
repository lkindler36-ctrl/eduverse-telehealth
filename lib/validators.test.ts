import assert from "node:assert/strict";
import { test } from "node:test";
import { parseNoteContent, visitCreateSchema } from "./validators";

test("visit create requires a reason", () => {
  const result = visitCreateSchema.safeParse({
    individualId: "x",
    visitType: "MEDICAL",
    scheduledAt: "2026-09-05T14:00",
    reason: "",
  });
  assert.equal(result.success, false);
});

test("SOAP content fills empty strings", () => {
  const content = parseNoteContent("SOAP", { subjective: "headache" });
  assert.equal("subjective" in content && content.subjective, "headache");
  assert.equal("objective" in content && content.objective, "");
});
