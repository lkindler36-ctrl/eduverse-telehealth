import assert from "node:assert/strict";
import { test } from "node:test";
import { magicLinkAck } from "./magic-link";
import { rateLimitAllow } from "./rate-limit";

test("magic-link public ack never includes a verify URL", () => {
  assert.deepEqual(magicLinkAck(), { ok: true });
  assert.equal("verifyUrl" in magicLinkAck(), false);
  assert.equal("emailed" in magicLinkAck(), false);
});

test("rate limiter blocks after max attempts in the window", () => {
  const store = new Map<string, number[]>();
  const now = 1_000_000;
  assert.equal(rateLimitAllow("ip:a@b.c", now, 60_000, 2, store), true);
  assert.equal(rateLimitAllow("ip:a@b.c", now + 10, 60_000, 2, store), true);
  assert.equal(rateLimitAllow("ip:a@b.c", now + 20, 60_000, 2, store), false);
});
