import assert from "node:assert/strict";
import { join } from "node:path";
import test from "node:test";
import { verifySecretProvenance } from "../../src/install/verify-provenance.js";
import { writeManagedSecret } from "../../src/install/storage.js";
import { createTestDeps } from "./test-deps.js";

test("secret provenance verifies managed secret and canonical raw global binding", async () => {
  const deps = createTestDeps();
  const homeDir = join(deps.root, "home");
  const projectRoot = join(deps.root, "project");

  try {
    const secret = await writeManagedSecret(deps, "gp-secret-value", {
      homeDir,
      platform: "posix",
      projectRoot,
    });
    const blockers = await verifySecretProvenance(deps, {
      globalConfigContents:
        '{"provider":{"gonkagate":{"options":{"apiKey":"{file:~/.gonkagate/mimo-code/api-key}"}}}}',
      key: "gp-secret-value",
      platform: "posix",
      projectConfigContents: '{"model":"gonkagate/alpha"}',
      secretPath: secret.path,
    });

    assert.deepEqual(blockers, []);
  } finally {
    deps.cleanup();
  }
});

test("secret provenance reports wrong binding, mismatch, and higher-precedence project binding with redaction", async () => {
  const deps = createTestDeps();

  try {
    const blockers = await verifySecretProvenance(deps, {
      globalConfigContents:
        '{"provider":{"gonkagate":{"options":{"apiKey":"{env:GONKAGATE_API_KEY}"}}}}',
      key: "gp-secret-value",
      platform: "posix",
      projectConfigContents:
        '{"provider":{"gonkagate":{"options":{"apiKey":"gp-project-secret"}}}}',
      secretPath: join(deps.root, "missing"),
    });
    const serialized = JSON.stringify(blockers);

    assert.match(serialized, /secret_provenance_failed/);
    assert.match(serialized, /project_secret_binding_forbidden/);
    assert.doesNotMatch(serialized, /gp-project-secret/);
  } finally {
    deps.cleanup();
  }
});

test("secret provenance reports POSIX permission mismatch", async () => {
  const deps = createTestDeps();
  const homeDir = join(deps.root, "home");
  const projectRoot = join(deps.root, "project");

  try {
    const secret = await writeManagedSecret(deps, "gp-secret-value", {
      homeDir,
      platform: "posix",
      projectRoot,
    });
    await deps.fs.chmod(secret.path, 0o644);
    const blockers = await verifySecretProvenance(deps, {
      globalConfigContents:
        '{"provider":{"gonkagate":{"options":{"apiKey":"{file:~/.gonkagate/mimo-code/api-key}"}}}}',
      key: "gp-secret-value",
      platform: "posix",
      secretPath: secret.path,
    });

    assert.match(JSON.stringify(blockers), /owner-only/);
  } finally {
    deps.cleanup();
  }
});
