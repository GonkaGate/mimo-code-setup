import assert from "node:assert/strict";
import test from "node:test";
import { parseCliOptions } from "../../src/cli/parse.js";
import { collectGonkaGateApiKey } from "../../src/install/secrets.js";
import { InstallerError } from "../../src/install/errors.js";
import { createTestDeps } from "./test-deps.js";

test("secret intake accepts env and stdin without depending on durable env runtime", async () => {
  const envDeps = createTestDeps();
  envDeps.setEnv({ GONKAGATE_API_KEY: " gp-env-secret " });
  const envResult = await collectGonkaGateApiKey({}, envDeps);
  assert.deepEqual(envResult, { key: "gp-env-secret", source: "env" });
  envDeps.cleanup();

  const stdinDeps = createTestDeps();
  stdinDeps.setStdin(" gp-stdin-secret\n");
  const stdinResult = await collectGonkaGateApiKey(
    { apiKeyStdin: true },
    stdinDeps,
  );
  assert.deepEqual(stdinResult, { key: "gp-stdin-secret", source: "stdin" });
  stdinDeps.cleanup();
});

test("secret intake uses masked prompt only for interactive TTYs", async () => {
  const deps = createTestDeps();
  deps.queuePrompt("gp-prompt-secret");
  const result = await collectGonkaGateApiKey({}, deps);
  assert.deepEqual(result, { key: "gp-prompt-secret", source: "prompt" });
  assert.deepEqual(deps.passwordPromptLog, [{ mask: true }]);
  deps.cleanup();

  const nonInteractive = createTestDeps();
  nonInteractive.streams.stdin.isTTY = false;
  await assert.rejects(
    () => collectGonkaGateApiKey({}, nonInteractive),
    (error) => {
      assert.equal(
        (error as InstallerError).code,
        "non_interactive_secret_required",
      );
      return true;
    },
  );
  nonInteractive.cleanup();
});

test("secret intake rejects empty, invalid, and plain CLI flag inputs with redaction", async () => {
  const empty = createTestDeps();
  empty.setStdin("   ");
  await assert.rejects(
    () => collectGonkaGateApiKey({ apiKeyStdin: true }, empty),
    (error) => {
      assert.equal((error as InstallerError).code, "missing_api_key");
      return true;
    },
  );
  empty.cleanup();

  const invalid = createTestDeps();
  invalid.setEnv({ GONKAGATE_API_KEY: "sk-not-gonka" });
  await assert.rejects(
    () => collectGonkaGateApiKey({}, invalid),
    (error) => {
      assert.equal((error as InstallerError).code, "invalid_api_key");
      assert.doesNotMatch(JSON.stringify(error), /sk-not-gonka/);
      return true;
    },
  );
  invalid.cleanup();

  assert.throws(
    () => parseCliOptions(["--api-key=gp-secret-value"]),
    /Plain --api-key is not supported/,
  );
});
