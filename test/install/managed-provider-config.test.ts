import assert from "node:assert/strict";
import test from "node:test";
import {
  CURRENT_PROVIDER_PACKAGE,
  GONKAGATE_BASE_URL,
  MANAGED_SECRET_FILE_REF,
} from "../../src/constants/gateway.js";
import type { ModelRegistry } from "../../src/constants/models.js";
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
    transport: "chat_completions",
    validationStatus: "validated",
  },
} as const satisfies ModelRegistry;

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
  assert.equal(config.models.alpha?.name, "Alpha");
});

test("generated model entries carry the live display name and context window", () => {
  const config = createManagedProviderConfig({
    "deepseek-ai/deepseek-v4-flash-0731": {
      adapterPackage: CURRENT_PROVIDER_PACKAGE,
      displayName: "DeepSeek V4 Flash 0731",
      limits: { context: 400_000 },
      modelId: "deepseek-ai/deepseek-v4-flash-0731",
      transport: "chat_completions",
      validationStatus: "validated",
    },
  });

  assert.deepEqual(config.models["deepseek-ai/deepseek-v4-flash-0731"], {
    limit: { context: 400_000, output: 0 },
    name: "DeepSeek V4 Flash 0731",
  });
});

test("no limit block is written when the gateway publishes no context window", () => {
  const config = createManagedProviderConfig(validatedRegistry);

  assert.equal("limit" in (config.models.beta ?? {}), false);
  assert.deepEqual(config.models.beta, { name: "Beta" });
});

test("candidate-only registry is not exposed in generated runtime provider catalog", () => {
  const candidateOnly = {
    candidate: {
      adapterPackage: CURRENT_PROVIDER_PACKAGE,
      displayName: "Candidate",
      modelId: "provider/candidate",
      transport: "chat_completions",
      validationStatus: "candidate",
    },
  } as const satisfies ModelRegistry;

  assert.deepEqual(createManagedProviderConfig(candidateOnly).models, {});
});

test("provider config rejects compatibility metadata that overrides canonical secret or base URL", () => {
  const invalid = {
    alpha: {
      adapterPackage: CURRENT_PROVIDER_PACKAGE,
      displayName: "Alpha",
      modelId: "provider/alpha",
      runtimeCompatibility: {
        providerOptions: { baseURL: "https://evil.test" },
      },
      transport: "chat_completions",
      validationStatus: "validated",
    },
  } as const satisfies ModelRegistry;

  assert.throws(() => createManagedProviderConfig(invalid), /cannot override/);
  assert.deepEqual(createManagedProviderConfigPatch(validatedRegistry).path, [
    "provider",
    "gonkagate",
  ]);
});
