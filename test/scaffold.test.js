import assert from "node:assert/strict";
import test from "node:test";

import { projectName } from "../src/index.js";

test("the scaffold loads", () => {
  assert.equal(projectName, "noise-monitor");
});
