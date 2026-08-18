import assert from "node:assert/strict";
import test from "node:test";
import { CURRENT_PROVIDER_PACKAGE } from "../../src/constants/gateway.js";
import { InstallerError } from "../../src/install/errors.js";
import {
  fetchGonkaGateModelCatalog,
  GONKAGATE_MODELS_URL,
  parseGonkaGateModelCatalog,
} from "../../src/install/model-catalog.js";
import { createTestDeps } from "./test-deps.js";

const legacyCatalogBody = {
  data: [
    {
      created: 0,
      id: "moonshotai/kimi-k2.6",
      object: "model",
      owned_by: "gonka",
    },
    {
      created: 0,
      id: "minimaxai/minimax-m2.7",
      object: "model",
      owned_by: "gonka",
    },
    {
      created: 0,
      id: "qwen/qwen3-235b-a22b-instruct-2507-fp8",
      object: "model",
      owned_by: "gonka",
    },
  ],
  object: "list",
};

test("GonkaGate model catalog fetch builds a runtime registry from every returned model id", async () => {
  const deps = createTestDeps();
  deps.queueHttpResponse({ body: legacyCatalogBody, status: 200 });

  try {
    const registry = await fetchGonkaGateModelCatalog(deps, "gp-secret-value");

    assert.equal(deps.httpLog[0]?.url, GONKAGATE_MODELS_URL);
    assert.equal(
      deps.httpLog[0]?.request?.headers?.Authorization,
      "Bearer gp-secret-value",
    );
    assert.deepEqual(Object.keys(registry), [
      "moonshotai/kimi-k2.6",
      "minimaxai/minimax-m2.7",
      "qwen/qwen3-235b-a22b-instruct-2507-fp8",
    ]);
    assert.equal(
      registry["moonshotai/kimi-k2.6"]?.adapterPackage,
      CURRENT_PROVIDER_PACKAGE,
    );
    assert.equal(
      registry["qwen/qwen3-235b-a22b-instruct-2507-fp8"]?.validationStatus,
      "validated",
    );
  } finally {
    deps.cleanup();
  }
});

test("catalog metadata is read live when the gateway publishes it", () => {
  const registry = parseGonkaGateModelCatalog({
    data: [
      {
        context_length: 400_000,
        created: 1_753_920_000,
        description: "Fast general-purpose model.",
        id: "deepseek-ai/deepseek-v4-flash-0731",
        name: "DeepSeek V4 Flash 0731",
        object: "model",
        owned_by: "gonka",
      },
      {
        contextLength: 240_000,
        id: "moonshotai/kimi-k2.6",
        name: "Kimi K2.6",
        object: "model",
      },
    ],
    object: "list",
  });

  assert.deepEqual(Object.keys(registry), [
    "deepseek-ai/deepseek-v4-flash-0731",
    "moonshotai/kimi-k2.6",
  ]);
  assert.equal(
    registry["deepseek-ai/deepseek-v4-flash-0731"]?.displayName,
    "DeepSeek V4 Flash 0731",
  );
  assert.equal(
    registry["deepseek-ai/deepseek-v4-flash-0731"]?.description,
    "Fast general-purpose model.",
  );
  assert.deepEqual(registry["deepseek-ai/deepseek-v4-flash-0731"]?.limits, {
    context: 400_000,
  });
  assert.equal(registry["moonshotai/kimi-k2.6"]?.displayName, "Kimi K2.6");
  assert.deepEqual(registry["moonshotai/kimi-k2.6"]?.limits, {
    context: 240_000,
  });
});

test("absent, null, and unusable catalog metadata falls back instead of failing", () => {
  const registry = parseGonkaGateModelCatalog({
    data: [
      { created: 0, id: "provider/legacy", object: "model", owned_by: "gonka" },
      {
        context_length: null,
        description: null,
        id: "provider/nulls",
        name: null,
        object: "model",
      },
      {
        context_length: 0,
        description: "   ",
        id: "provider/unusable",
        name: "   ",
        object: "model",
      },
      {
        context_length: "400000",
        id: "provider/wrong-types",
        name: 42,
        object: "model",
      },
    ],
    object: "list",
  });

  for (const key of [
    "provider/legacy",
    "provider/nulls",
    "provider/unusable",
    "provider/wrong-types",
  ]) {
    assert.equal(registry[key]?.displayName, key);
    assert.equal(registry[key]?.description, undefined);
    assert.equal(registry[key]?.limits, undefined);
    assert.equal(registry[key]?.validationStatus, "validated");
  }
});

test("GonkaGate model catalog maps auth and malformed catalog failures to installer errors", async () => {
  const auth = createTestDeps();
  auth.queueHttpResponse({
    body: { error: { message: "Invalid credentials." } },
    status: 401,
  });

  await assert.rejects(
    () => fetchGonkaGateModelCatalog(auth, "gp-secret-value"),
    (error) => {
      assert.equal((error as InstallerError).code, "invalid_api_key");
      return true;
    },
  );
  auth.cleanup();

  assert.throws(
    () => parseGonkaGateModelCatalog({ data: [{ object: "model" }] }),
    (error) => {
      assert.equal(
        (error as InstallerError).code,
        "model_catalog_parse_failed",
      );
      return true;
    },
  );

  assert.throws(
    () => parseGonkaGateModelCatalog({ data: [], object: "list" }),
    (error) => {
      assert.equal((error as InstallerError).code, "model_catalog_empty");
      return true;
    },
  );
});
