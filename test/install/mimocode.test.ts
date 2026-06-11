import assert from "node:assert/strict";
import test from "node:test";
import {
  detectMimoCode,
  parseMimoVersion,
} from "../../src/install/mimocode.js";
import { InstallerError } from "../../src/install/errors.js";
import { createTestDeps } from "./test-deps.js";

test("parseMimoVersion extracts semver from common --version output", () => {
  assert.equal(parseMimoVersion("mimo 0.1.0\n"), "0.1.0");
  assert.equal(parseMimoVersion("@mimo-ai/cli/0.1.0 darwin-arm64"), "0.1.0");
  assert.equal(parseMimoVersion("not a version"), undefined);
});

test("detectMimoCode reports missing CLI, unparseable, old, exact, and newer versions", async () => {
  const missing = createTestDeps();
  missing.queueCommand({ exitCode: 127, stderr: "not found", stdout: "" });
  await assert.rejects(
    () => detectMimoCode(missing),
    (error) => {
      assert.equal(error instanceof InstallerError, true);
      assert.equal((error as InstallerError).code, "mimocode_not_found");
      return true;
    },
  );
  missing.cleanup();

  const unparseable = createTestDeps();
  unparseable.queueCommand({ exitCode: 0, stderr: "", stdout: "mimo dev\n" });
  await assert.rejects(
    () => detectMimoCode(unparseable),
    (error) => {
      assert.equal(
        (error as InstallerError).code,
        "mimocode_version_unparseable",
      );
      return true;
    },
  );
  unparseable.cleanup();

  const old = createTestDeps();
  old.queueCommand({ exitCode: 0, stderr: "", stdout: "mimo 0.0.9\n" });
  await assert.rejects(
    () => detectMimoCode(old),
    (error) => {
      assert.equal((error as InstallerError).code, "mimocode_version_too_old");
      return true;
    },
  );
  old.cleanup();

  const exact = createTestDeps();
  exact.queueCommand({ exitCode: 0, stderr: "", stdout: "mimo 0.1.0\n" });
  const exactResult = await detectMimoCode(exact);
  assert.equal(exactResult.info.installedVersion, "0.1.0");
  assert.equal(exactResult.info.policy, "audited");
  exact.cleanup();

  const newerBlocked = createTestDeps();
  newerBlocked.queueCommand({
    exitCode: 0,
    stderr: "",
    stdout: "mimo 0.2.0\n",
  });
  await assert.rejects(
    () => detectMimoCode(newerBlocked),
    (error) => {
      assert.equal(
        (error as InstallerError).code,
        "mimocode_newer_than_audited",
      );
      return true;
    },
  );
  newerBlocked.cleanup();

  const newerAllowed = createTestDeps();
  newerAllowed.queueCommand({
    exitCode: 0,
    stderr: "",
    stdout: "mimo 0.2.0\n",
  });
  const newerAllowedResult = await detectMimoCode(newerAllowed, {
    newerVersionPolicy: "allow_with_warning",
  });
  assert.equal(newerAllowedResult.info.policy, "newer_allowed_with_warning");
  assert.equal(newerAllowedResult.warnings.length, 1);
  newerAllowed.cleanup();
});
