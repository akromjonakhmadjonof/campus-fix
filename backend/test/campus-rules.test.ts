import { test } from "node:test";
import assert from "node:assert/strict";
import {
  digest,
  hashPassword,
  verifyPassword,
  similarity,
  nextStatus,
} from "../src/campus/rules.js";
test("password hashes are salted and reject the wrong password", async () => {
  const first = await hashPassword("fictional-test-password");
  const second = await hashPassword("fictional-test-password");
  assert.notEqual(first, second);
  assert.equal(await verifyPassword("fictional-test-password", first), true);
  assert.equal(await verifyPassword("wrong-password", first), false);
  assert.notEqual(digest("first-secret"), digest("second-secret"));
});
test("similarity is deterministic, punctuation-insensitive and bounded", () => {
  assert.equal(similarity("Leaking water fountain!", "water fountain leaking"), 1);
  assert.equal(similarity("broken chair", "leaking water"), 0);
  assert.equal(similarity("", ""), 0);
  assert.ok(similarity("fountain leaking", "fountain leaking outside") > 0.5);
});
test("status progression cannot skip or reverse maintenance work", () => {
  assert.equal(nextStatus("REPORTED", "IN_PROGRESS"), true);
  assert.equal(nextStatus("IN_PROGRESS", "RESOLVED"), true);
  for (const [from, to] of [
    ["REPORTED", "RESOLVED"],
    ["RESOLVED", "IN_PROGRESS"],
    ["IN_PROGRESS", "IN_PROGRESS"],
  ])
    assert.equal(nextStatus(from ?? "", to ?? ""), false);
});
