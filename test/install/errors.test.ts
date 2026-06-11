import assert from "node:assert/strict";
import test from "node:test";
import { InstallerError, createBlocker } from "../../src/install/errors.js";
import { redactJsonValue, redactText } from "../../src/install/redact.js";

test("installer errors redact secret material", () => {
  const error = new InstallerError({
    category: "secret_intake",
    code: "invalid_api_key",
    detail: "raw gp-secret-value detail",
    message: "failed with gp-secret-value",
  });

  assert.equal(error.message, "failed with gp-[redacted]");
  assert.equal(error.detail, "raw gp-[redacted] detail");

  const blocker = createBlocker(error, "secret");
  assert.equal(blocker.source, "secret");
  assert.equal(blocker.code, "invalid_api_key");
  assert.doesNotMatch(JSON.stringify(blocker), /gp-secret-value/);
});

test("redaction applies to text and JSON-shaped diagnostics", () => {
  assert.equal(redactText("token gp-test-secret"), "token gp-[redacted]");
  assert.deepEqual(redactJsonValue({ apiKey: "gp-test-secret", ok: true }), {
    apiKey: "[redacted]",
    ok: true,
  });
});
