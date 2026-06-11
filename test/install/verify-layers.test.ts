import assert from "node:assert/strict";
import test from "node:test";
import { checkProjectConfigCommitSafety } from "../../src/install/verify-layers.js";
import { parseJsoncDocument } from "../../src/install/jsonc.js";
import {
  createScopeWritePlan,
  applyScopeValues,
} from "../../src/install/scope.js";
import { CURRENT_PROVIDER_PACKAGE } from "../../src/constants/gateway.js";

test("generated project-scope config stays commit-safe", () => {
  const plan = createScopeWritePlan({
    modelKey: "alpha",
    registry: {
      alpha: {
        adapterPackage: CURRENT_PROVIDER_PACKAGE,
        displayName: "Alpha",
        modelId: "provider/alpha",
        recommended: true,
        transport: "chat_completions",
        validationStatus: "validated",
      },
    },
    scope: "project",
  });
  const project = applyScopeValues("{}", plan.projectValues);

  assert.deepEqual(checkProjectConfigCommitSafety(project), []);
  assert.equal(parseJsoncDocument(project).data.provider, undefined);
});

test("project commit-safety detects secret bindings, raw keys, managed paths, and auth data with redacted diagnostics", () => {
  const unsafe = JSON.stringify({
    auth: { gonkagate: "gp-secret-value" },
    provider: {
      gonkagate: {
        options: {
          apiKey: "{file:~/.gonkagate/mimo-code/api-key}",
        },
      },
    },
  });
  const blockers = checkProjectConfigCommitSafety(unsafe);
  const serialized = JSON.stringify(blockers);

  assert.ok(blockers.length >= 3);
  assert.match(serialized, /project_secret_binding_forbidden/);
  assert.doesNotMatch(serialized, /gp-secret-value/);
  assert.match(serialized, /gp-\[redacted\]/);
});
