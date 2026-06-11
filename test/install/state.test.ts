import assert from "node:assert/strict";
import { join } from "node:path";
import test from "node:test";
import {
  createInstallState,
  parseInstallState,
  readInstallState,
  writeInstallState,
} from "../../src/install/state.js";
import { createTestDeps } from "./test-deps.js";

test("install state serializes, parses, and persists durable setup metadata", async () => {
  const deps = createTestDeps();

  try {
    const state = createInstallState({
      globalConfigTarget: "/config/mimocode.jsonc",
      lastDurableSetupAt: deps.clock.now().toISOString(),
      mimoCodeVersion: "0.1.0",
      previousManagedModelRef: "gonkagate/old",
      projectConfigTarget: "/repo/.mimocode/mimocode.json",
      scope: "project",
      selectedModelKey: "test-model",
    });
    const path = join(deps.root, "install-state.json");

    await writeInstallState(deps, path, state);
    assert.deepEqual(await readInstallState(deps, path), state);
    assert.equal(parseInstallState(JSON.stringify(state)).scope, "project");
    assert.throws(() => parseInstallState("{}"), /missing/);
    assert.equal(
      await readInstallState(deps, join(deps.root, "missing.json")),
      undefined,
    );
  } finally {
    deps.cleanup();
  }
});
