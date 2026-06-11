import assert from "node:assert/strict";
import test from "node:test";
import { CURRENT_PROVIDER_PACKAGE } from "../../src/constants/gateway.js";
import type { CuratedModelRegistry } from "../../src/constants/models.js";
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
    recommended: true,
    transport: "chat_completions",
    validationStatus: "validated",
  },
} as const satisfies CuratedModelRegistry;

const twoValidated = {
  alpha: oneValidated.alpha,
  beta: {
    adapterPackage: CURRENT_PROVIDER_PACKAGE,
    displayName: "Beta",
    modelId: "provider/beta",
    recommended: false,
    transport: "chat_completions",
    validationStatus: "validated",
  },
} as const satisfies CuratedModelRegistry;

test("validated-only selection blocks candidate-only and unsupported model keys", async () => {
  const deps = createTestDeps();
  await assert.rejects(
    () =>
      selectValidatedModel({ yes: true }, deps, {
        candidate: {
          adapterPackage: CURRENT_PROVIDER_PACKAGE,
          displayName: "Candidate",
          modelId: "provider/candidate",
          recommended: false,
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

test("validated-only selection supports recommended, single, prompt, and ambiguity behavior", async () => {
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
    (await selectValidatedModel({}, deps, twoValidated)).model.key,
    "alpha",
  );

  const ambiguousDeps = createTestDeps();
  const noRecommended = {
    alpha: { ...oneValidated.alpha, recommended: false },
    beta: { ...twoValidated.beta, recommended: false },
  } as const satisfies CuratedModelRegistry;
  await assert.rejects(
    () => selectValidatedModel({ yes: true }, ambiguousDeps, noRecommended),
    (error) => {
      assert.equal((error as InstallerError).code, "ambiguous_model_selection");
      return true;
    },
  );
  assert.equal(await selectScope(undefined, deps, true), "user");
  deps.cleanup();
  ambiguousDeps.cleanup();
});
