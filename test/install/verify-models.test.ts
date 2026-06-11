import assert from "node:assert/strict";
import test from "node:test";
import {
  createInferredProviderBlocker,
  detectProviderGatingBlockers,
  verifyModelVisibility,
} from "../../src/install/verify-models.js";
import { createTestDeps } from "./test-deps.js";

test("mimo models gonkagate verifies provider/model visibility without replacing config checks", async () => {
  const success = createTestDeps();
  success.queueCommand({
    exitCode: 0,
    stderr: "",
    stdout: "gonkagate/alpha\n",
  });
  assert.deepEqual(await verifyModelVisibility(success, "alpha"), []);
  success.cleanup();

  const missing = createTestDeps();
  missing.queueCommand({ exitCode: 0, stderr: "", stdout: "gonkagate/beta\n" });
  assert.match(
    JSON.stringify(await verifyModelVisibility(missing, "alpha")),
    /model_visibility_failed/,
  );
  missing.cleanup();

  const failure = createTestDeps();
  failure.queueCommand({ exitCode: 1, stderr: "no provider", stdout: "" });
  assert.match(
    JSON.stringify(await verifyModelVisibility(failure, "alpha")),
    /model_visibility_failed/,
  );
  failure.cleanup();
});

test("provider gating blockers cover allow deny and whitelist blacklist behavior", () => {
  const blockers = detectProviderGatingBlockers(
    {
      disabled_providers: ["gonkagate"],
      enabled_providers: ["anthropic"],
      provider: {
        gonkagate: {
          blacklist: ["alpha"],
          whitelist: ["beta"],
        },
      },
    },
    "alpha",
  );
  const serialized = JSON.stringify(blockers);

  assert.match(serialized, /provider_not_enabled/);
  assert.match(serialized, /provider_disabled/);
  assert.match(serialized, /model_not_whitelisted/);
  assert.match(serialized, /model_blacklisted/);
  assert.match(
    JSON.stringify(createInferredProviderBlocker("remote policy")),
    /no locally inspectable layer/,
  );
});
