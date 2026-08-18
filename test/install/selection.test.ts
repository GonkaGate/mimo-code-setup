import assert from "node:assert/strict";
import test from "node:test";
import { CURRENT_PROVIDER_PACKAGE } from "../../src/constants/gateway.js";
import type { ModelRegistry } from "../../src/constants/models.js";
import { InstallerError } from "../../src/install/errors.js";
import {
  selectScope,
  selectValidatedModel,
} from "../../src/install/selection.js";
import { createTestDeps } from "./test-deps.js";

const oneValidated = {
  alpha: {
    adapterPackage: CURRENT_PROVIDER_PACKAGE,
    displayName: "Alpha",
    modelId: "provider/alpha",
    transport: "chat_completions",
    validationStatus: "validated",
  },
} as const satisfies ModelRegistry;

const twoValidated = {
  alpha: oneValidated.alpha,
  beta: {
    adapterPackage: CURRENT_PROVIDER_PACKAGE,
    displayName: "Beta",
    modelId: "provider/beta",
    transport: "chat_completions",
    validationStatus: "validated",
  },
} as const satisfies ModelRegistry;

test("validated-only selection blocks candidate-only and unsupported model keys", async () => {
  const deps = createTestDeps();
  await assert.rejects(
    () =>
      selectValidatedModel({ yes: true }, deps, {
        candidate: {
          adapterPackage: CURRENT_PROVIDER_PACKAGE,
          displayName: "Candidate",
          modelId: "provider/candidate",
          transport: "chat_completions",
          validationStatus: "candidate",
        },
      }),
    (error) => {
      assert.equal(
        (error as InstallerError).code,
        "validated_models_unavailable",
      );
      return true;
    },
  );
  await assert.rejects(
    () => selectValidatedModel({ modelKey: "missing" }, deps, oneValidated),
    (error) => {
      assert.equal((error as InstallerError).code, "unsupported_model");
      return true;
    },
  );
  deps.cleanup();
});

test("non-interactive selection defaults to the first live catalog entry", async () => {
  const deps = createTestDeps();
  assert.equal(
    (await selectValidatedModel({ yes: true }, deps, oneValidated)).model.key,
    "alpha",
  );
  assert.equal(
    (await selectValidatedModel({ modelKey: "alpha" }, deps, oneValidated))
      .model.key,
    "alpha",
  );
  assert.equal(
    (await selectValidatedModel({ yes: true }, deps, twoValidated)).model.key,
    "alpha",
  );

  const reversed = {
    beta: twoValidated.beta,
    alpha: twoValidated.alpha,
  } as const satisfies ModelRegistry;
  assert.equal(
    (await selectValidatedModel({ yes: true }, deps, reversed)).model.key,
    "beta",
  );
  assert.equal(await selectScope(undefined, deps, true), "user");
  deps.cleanup();
});

test("interactive picker offers live catalog order, display names, and descriptions", async () => {
  const deps = createTestDeps();
  const described = {
    alpha: { ...twoValidated.alpha, displayName: "Alpha One" },
    beta: { ...twoValidated.beta, description: "Fast beta model" },
  } as const satisfies ModelRegistry;

  assert.equal(
    (await selectValidatedModel({}, deps, described)).model.key,
    "alpha",
  );
  assert.deepEqual(deps.selectPromptLog[0]?.choices, [
    { name: "Alpha One", value: "alpha" },
    { description: "Fast beta model", name: "Beta", value: "beta" },
  ]);
  deps.cleanup();
});
