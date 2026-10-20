import assert from "node:assert/strict";
import { test } from "node:test";
import { formatDate } from "./utils";

test("formatDate uses UTC calendar date for midnight UTC DOBs", () => {
  assert.equal(formatDate(new Date("1985-03-12T00:00:00.000Z")), "Mar 12, 1985");
  assert.equal(formatDate(new Date("1978-11-04T00:00:00.000Z")), "Nov 4, 1978");
});
