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

const catalogBody = {
  data: [
    { id: "moonshotai/kimi-k2.6", object: "model", owned_by: "gonka" },
    { id: "minimaxai/minimax-m2.7", object: "model", owned_by: "gonka" },
    {
      id: "qwen/qwen3-235b-a22b-instruct-2507-fp8",
      object: "model",
      owned_by: "gonka",
    },
  ],
  object: "list",
};

test("GonkaGate model catalog fetch builds a runtime registry from every returned model id", async () => {
  const deps = createTestDeps();
  deps.queueHttpResponse({ body: catalogBody, status: 200 });

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
    assert.equal(registry["moonshotai/kimi-k2.6"]?.recommended, true);
    assert.equal(registry["minimaxai/minimax-m2.7"]?.recommended, false);
    assert.equal(
      registry["qwen/qwen3-235b-a22b-instruct-2507-fp8"]?.validationStatus,
      "validated",
    );
  } finally {
    deps.cleanup();
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
