import assert from "node:assert/strict";
import test from "node:test";
import type { InstallerBlockedResult } from "../../src/install/contracts.js";
import { redactJsonValue } from "../../src/install/redact.js";

test("installer JSON result shape carries typed blocked errors without secrets", () => {
  const result: InstallerBlockedResult = {
    blockers: [
      {
        code: "effective_config_mismatch",
        detail: "resolved apiKey gp-secret-value did not match",
        message: "current session overrides GonkaGate",
        source: "verification",
      },
    ],
    errorCode: "effective_config_mismatch",
    message: "setup blocked by gp-secret-value",
    ok: false,
    provider: "gonkagate",
    status: "blocked",
  };

  const redacted = redactJsonValue(result);
  const json = JSON.stringify(redacted);

  assert.match(json, /"ok":false/);
  assert.match(json, /"status":"blocked"/);
  assert.match(json, /"errorCode":"effective_config_mismatch"/);
  assert.doesNotMatch(json, /gp-secret-value/);
  assert.match(json, /gp-\[redacted\]/);
});
