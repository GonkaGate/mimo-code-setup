import assert from "node:assert/strict";
import test from "node:test";
import {
  CURRENT_PROVIDER_PACKAGE,
  GONKAGATE_BASE_URL,
  MANAGED_SECRET_FILE_REF,
} from "../../src/constants/gateway.js";
import type { CuratedModelRegistry } from "../../src/constants/models.js";
import {
  createManagedProviderConfig,
  createManagedProviderConfigPatch,
} from "../../src/install/managed-provider-config.js";

const validatedRegistry = {
  alpha: {
    adapterPackage: CURRENT_PROVIDER_PACKAGE,
    displayName: "Alpha",
    limits: { context: 10, output: 20 },
    modelId: "provider/alpha",
    recommended: true,
    runtimeCompatibility: {
      modelHeaders: { "x-test": "1" },
      modelOptions: { temperature: 0 },
    },
    transport: "chat_completions",
    validationStatus: "validated",
  },
  beta: {
    adapterPackage: CURRENT_PROVIDER_PACKAGE,
    displayName: "Beta",
    modelId: "provider/beta",
    recommended: false,
    transport: "chat_completions",
    validationStatus: "validated",
  },
} as const satisfies CuratedModelRegistry;

test("managed provider config writes only validated models with canonical provider options", () => {
  const empty = createManagedProviderConfig({});
  assert.deepEqual(empty.models, {});

  const config = createManagedProviderConfig(validatedRegistry);
  assert.equal(config.npm, CURRENT_PROVIDER_PACKAGE);
  assert.equal(config.options.apiKey, MANAGED_SECRET_FILE_REF);
  assert.equal(config.options.baseURL, GONKAGATE_BASE_URL);
  assert.equal(config.options.setCacheKey, false);
  assert.deepEqual(Object.keys(config.models), ["alpha", "beta"]);
  assert.deepEqual(config.models.alpha?.limit, { context: 10, output: 20 });
  assert.deepEqual(config.models.alpha?.headers, { "x-test": "1" });
  assert.deepEqual(config.models.beta?.limit, { context: 0, output: 0 });
});

test("candidate-only registry is not exposed in generated runtime provider catalog", () => {
  const candidateOnly = {
    candidate: {
      adapterPackage: CURRENT_PROVIDER_PACKAGE,
      displayName: "Candidate",
      modelId: "provider/candidate",
      recommended: false,
      transport: "chat_completions",
      validationStatus: "candidate",
    },
  } as const satisfies CuratedModelRegistry;

  assert.deepEqual(createManagedProviderConfig(candidateOnly).models, {});
});

test("provider config rejects compatibility metadata that overrides canonical secret or base URL", () => {
  const invalid = {
    alpha: {
      adapterPackage: CURRENT_PROVIDER_PACKAGE,
      displayName: "Alpha",
      modelId: "provider/alpha",
      recommended: true,
      runtimeCompatibility: {
        providerOptions: { baseURL: "https://evil.test" },
      },
      transport: "chat_completions",
      validationStatus: "validated",
    },
  } as const satisfies CuratedModelRegistry;

  assert.throws(() => createManagedProviderConfig(invalid), /cannot override/);
  assert.deepEqual(createManagedProviderConfigPatch(validatedRegistry).path, [
    "provider",
    "gonkagate",
  ]);
});
