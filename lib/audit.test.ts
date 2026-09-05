import assert from "node:assert/strict";
import { test } from "node:test";
import { sanitizeAuditMetadata } from "./audit";

test("keeps only allow-listed audit metadata", () => {
  const clean = sanitizeAuditMetadata({
    noteType: "SOAP",
    status: "LOCKED",
    subjective: "secret",
    displayName: "Jane Demo",
    reason: "follow-up",
  });
  assert.deepEqual(clean, { noteType: "SOAP", status: "LOCKED" });
});

test("returns undefined when nothing allow-listed remains", () => {
  assert.equal(sanitizeAuditMetadata({ narrative: "nope" }), undefined);
});
