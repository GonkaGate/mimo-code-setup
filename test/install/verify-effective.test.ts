import assert from "node:assert/strict";
import test from "node:test";
import {
  verifyDurableEffectiveConfig,
  verifyCurrentSessionEffectiveConfig,
} from "../../src/install/verify-effective.js";
import { detectCurrentSessionOverrideBlockers } from "../../src/install/verify-layers.js";
import { createTestDeps } from "./test-deps.js";

const matchingConfig = JSON.stringify({
  model: "gonkagate/alpha",
  small_model: "gonkagate/alpha",
  provider: {
    gonkagate: {
      npm: "@ai-sdk/openai-compatible",
      options: {
        baseURL: "https://api.gonkagate.com/v1",
        apiKey: "gp-secret-value",
      },
      models: { alpha: { name: "Alpha" } },
    },
  },
});

test("durable effective config verification parses raw debug output internally and redacts diagnostics", async () => {
  const deps = createTestDeps();
  deps.setEnv({ MIMOCODE_CONFIG_CONTENT: '{"model":"other/model"}' });
  deps.queueCommand({ exitCode: 0, stderr: "", stdout: matchingConfig });

  const result = await verifyDurableEffectiveConfig(deps, {
    modelKey: "alpha",
    validatedModelKeys: ["alpha"],
  });

  assert.equal(result.commandMayNormalizeConfig, true);
  assert.deepEqual(result.blockers, []);
  assert.equal(
    deps.commandLog[0]?.options?.env?.MIMOCODE_CONFIG_CONTENT,
    undefined,
  );
  deps.cleanup();
});

test("effective config verification reports mismatches, command failures, parse failures, and redacts secret output", async () => {
  const mismatch = createTestDeps();
  mismatch.queueCommand({
    exitCode: 0,
    stderr: "",
    stdout: JSON.stringify({ model: "other/model", provider: {} }),
  });
  const mismatchResult = await verifyDurableEffectiveConfig(mismatch, {
    modelKey: "alpha",
    validatedModelKeys: ["alpha"],
  });
  assert.ok(mismatchResult.blockers.length >= 1);
  mismatch.cleanup();

  const failure = createTestDeps();
  failure.queueCommand({
    exitCode: 1,
    stderr: "failed with gp-secret-value",
    stdout: "",
  });
  const failureResult = await verifyCurrentSessionEffectiveConfig(failure, {
    modelKey: "alpha",
    validatedModelKeys: ["alpha"],
  });
  assert.doesNotMatch(
    JSON.stringify(failureResult.blockers),
    /gp-secret-value/,
  );
  failure.cleanup();

  const parseFailure = createTestDeps();
  parseFailure.queueCommand({ exitCode: 0, stderr: "", stdout: "{" });
  const parseFailureResult = await verifyDurableEffectiveConfig(parseFailure, {
    modelKey: "alpha",
    validatedModelKeys: ["alpha"],
  });
  assert.match(
    JSON.stringify(parseFailureResult.blockers),
    /effective_config_parse_failed/,
  );
  parseFailure.cleanup();
});

test("effective config verification catches wrong small_model, package, base URL, and missing catalog entries", async () => {
  const deps = createTestDeps();
  deps.queueCommand({
    exitCode: 0,
    stderr: "",
    stdout: JSON.stringify({
      model: "gonkagate/alpha",
      small_model: "other/small",
      provider: {
        gonkagate: {
          npm: "@ai-sdk/openai",
          options: { baseURL: "https://wrong.test" },
          models: {},
        },
      },
    }),
  });

  const result = await verifyDurableEffectiveConfig(deps, {
    modelKey: "alpha",
    validatedModelKeys: ["alpha"],
  });
  const serialized = JSON.stringify(result.blockers);

  assert.match(serialized, /small_model/);
  assert.match(serialized, /provider package/);
  assert.match(serialized, /base URL/);
  assert.match(serialized, /missing validated model/);
  deps.cleanup();
});

test("current-session override blockers cover MiMoCode override variables and project disable behavior", () => {
  assert.deepEqual(
    detectCurrentSessionOverrideBlockers({
      env: { MIMOCODE_CONFIG_CONTENT: "{}" },
      projectScope: false,
      resolvedMatchesDurable: true,
    }),
    [],
  );
  assert.match(
    JSON.stringify(
      detectCurrentSessionOverrideBlockers({
        env: { MIMOCODE_CONFIG: "/tmp/config.json" },
        projectScope: false,
        resolvedMatchesDurable: false,
      }),
    ),
    /runtime_override_conflict/,
  );
  assert.match(
    JSON.stringify(
      detectCurrentSessionOverrideBlockers({
        env: { MIMOCODE_DISABLE_PROJECT_CONFIG: "1" },
        projectScope: true,
        resolvedMatchesDurable: true,
      }),
    ),
    /MIMOCODE_DISABLE_PROJECT_CONFIG/,
  );
  assert.match(
    JSON.stringify(
      detectCurrentSessionOverrideBlockers({
        env: {
          MIMOCODE_AUTH_CONTENT: "{}",
          MIMOCODE_CONFIG_DIR: "/tmp/mimo-config-dir",
        },
        projectScope: false,
        resolvedMatchesDurable: false,
      }),
    ),
    /MIMOCODE_AUTH_CONTENT/,
  );
});
