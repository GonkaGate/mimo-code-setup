import assert from "node:assert/strict";
import test from "node:test";
import { CURRENT_PROVIDER_PACKAGE } from "../../src/constants/gateway.js";
import type { ModelRegistry } from "../../src/constants/models.js";
import { getConfigValue } from "../../src/install/config-value.js";
import { parseJsoncDocument } from "../../src/install/jsonc.js";
import {
  createScopeWritePlan,
  applyScopeValues,
} from "../../src/install/scope.js";

const registry = {
  alpha: {
    adapterPackage: CURRENT_PROVIDER_PACKAGE,
    displayName: "Alpha",
    modelId: "provider/alpha",
    transport: "chat_completions",
    validationStatus: "validated",
  },
} as const satisfies ModelRegistry;

test("user scope writes provider and activation to global config only", () => {
  const plan = createScopeWritePlan({
    modelKey: "alpha",
    registry,
    scope: "user",
  });
  const global = parseJsoncDocument(
    applyScopeValues('{"ui":true}\n', plan.globalValues),
  );

  assert.equal(getConfigValue(global.data, ["ui"]), true);
  assert.equal(getConfigValue(global.data, ["model"]), "gonkagate/alpha");
  assert.equal(getConfigValue(global.data, ["small_model"]), "gonkagate/alpha");
  assert.equal(
    getConfigValue(global.data, ["provider", "gonkagate", "npm"]),
    CURRENT_PROVIDER_PACKAGE,
  );
  assert.equal(plan.projectValues.length, 0);
});

test("project scope writes provider globally and activation only to project config", () => {
  const plan = createScopeWritePlan({
    modelKey: "alpha",
    registry,
    scope: "project",
  });
  const global = parseJsoncDocument(applyScopeValues("{}", plan.globalValues));
  const project = parseJsoncDocument(
    applyScopeValues("{}", plan.projectValues),
  );

  assert.equal(getConfigValue(global.data, ["model"]), undefined);
  assert.equal(
    getConfigValue(global.data, ["provider", "gonkagate", "options", "apiKey"]),
    "{file:~/.gonkagate/mimo-code/api-key}",
  );
  assert.equal(getConfigValue(project.data, ["model"]), "gonkagate/alpha");
  assert.equal(
    getConfigValue(project.data, ["small_model"]),
    "gonkagate/alpha",
  );
  assert.equal(getConfigValue(project.data, ["provider"]), undefined);
});

test("candidate-only registry writes no public provider model catalog entries", () => {
  const candidateOnly = {
    candidate: {
      adapterPackage: CURRENT_PROVIDER_PACKAGE,
      displayName: "Candidate",
      modelId: "provider/candidate",
      transport: "chat_completions",
      validationStatus: "candidate",
    },
  } as const satisfies ModelRegistry;
  const plan = createScopeWritePlan({
    modelKey: "candidate",
    registry: candidateOnly,
    scope: "user",
  });
  const global = parseJsoncDocument(applyScopeValues("{}", plan.globalValues));

  assert.deepEqual(
    getConfigValue(global.data, ["provider", "gonkagate", "models"]),
    {},
  );
});
