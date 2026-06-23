import assert from "node:assert/strict";
import test from "node:test";
import { cleanupInstallerOwnedActivation } from "../../src/install/managed-config-mutations.js";
import { getConfigValue } from "../../src/install/config-value.js";
import { parseJsoncDocument } from "../../src/install/jsonc.js";

test("cleanup removes only installer-owned stale activation while preserving unrelated config", () => {
  const source = JSON.stringify(
    {
      model: "gonkagate/old",
      permissions: { edit: "ask" },
      small_model: "gonkagate/current",
    },
    null,
    2,
  );
  const updated = cleanupInstallerOwnedActivation(source, {
    currentModelKey: "current",
    installState: {
      globalConfigTarget: "/config",
      installerVersion: "0.1.0",
      lastDurableSetupAt: "2026-06-11T00:00:00.000Z",
      mimoCodeMinimumVersion: "0.1.0",
      mimoCodeVersion: "0.1.0",
      previousManagedModelRef: "gonkagate/old",
      providerPackage: "@ai-sdk/openai-compatible",
      scope: "project",
      selectedModelKey: "current",
      transport: "chat_completions",
    },
  });
  const parsed = parseJsoncDocument(updated);

  assert.equal(getConfigValue(parsed.data, ["model"]), undefined);
  assert.equal(getConfigValue(parsed.data, ["small_model"]), undefined);
  assert.deepEqual(getConfigValue(parsed.data, ["permissions"]), {
    edit: "ask",
  });
});

test("cleanup preserves non-owned activation when ownership cannot be proven", () => {
  const source = '{"model":"anthropic/claude","small_model":"other/light"}\n';
  const updated = cleanupInstallerOwnedActivation(source, {
    currentModelKey: "current",
  });
  const parsed = parseJsoncDocument(updated);

  assert.equal(getConfigValue(parsed.data, ["model"]), "anthropic/claude");
  assert.equal(getConfigValue(parsed.data, ["small_model"]), "other/light");
});
