import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import { requireChanges } from "../src/projects/projects.service.js";
import { assertTestDatabase } from "./test-database.js";

test("empty updates are rejected; an empty description is an intentional edit", () => {
  assert.throws(() => requireChanges({}));
  assert.doesNotThrow(() => requireChanges({ description: "" }));
});
test("test database guard refuses development/production targets", () => {
  assert.throws(() =>
    assertTestDatabase("production", "postgresql://u:p@localhost/campus_fix_test"),
  );
  assert.throws(() => assertTestDatabase("test", "postgresql://u:p@localhost/campus_fix"));
  assert.throws(() => assertTestDatabase("test", undefined));
  assert.doesNotThrow(() =>
    assertTestDatabase("test", "postgresql://u:p@postgres/campus_fix_test"),
  );
});
