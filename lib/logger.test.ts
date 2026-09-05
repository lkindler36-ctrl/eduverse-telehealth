import assert from "node:assert/strict";
import { test } from "node:test";
import { logInfo } from "./logger";

test("logInfo accepts operational fields", () => {
  logInfo({ event: "unit_test", actorId: "user_1", status: 200, count: 2 });
});

test("logInfo rejects note-like fields", () => {
  assert.throws(
    () =>
      logInfo({
        event: "unit_test",
        // @ts-expect-error verifying runtime guard
        subjective: "do not log",
      }),
    /PHI/,
  );
});
