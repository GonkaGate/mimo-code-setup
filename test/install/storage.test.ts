import assert from "node:assert/strict";
import { join } from "node:path";
import test from "node:test";
import {
  resolveManagedHomeDir,
  resolveManagedPaths,
} from "../../src/install/managed-files.js";
import {
  verifyManagedSecret,
  writeManagedSecret,
} from "../../src/install/storage.js";
import { createTestDeps } from "./test-deps.js";

test("managed secret storage writes outside projects and verifies contents without printing keys", async () => {
  const deps = createTestDeps();
  const homeDir = join(deps.root, "home");
  const projectRoot = join(deps.root, "project");

  try {
    const result = await writeManagedSecret(deps, "gp-secret-value", {
      homeDir,
      platform: "posix",
      projectRoot,
    });

    assert.equal(result.changed, true);
    assert.equal(
      await verifyManagedSecret(deps, "gp-secret-value", result.path),
      true,
    );
    assert.equal(result.path.startsWith(projectRoot), false);
  } finally {
    deps.cleanup();
  }
});

test("managed secret storage repairs POSIX permissions without rewriting unchanged secrets", async () => {
  const deps = createTestDeps();
  const homeDir = join(deps.root, "home");
  const projectRoot = join(deps.root, "project");

  try {
    await writeManagedSecret(deps, "gp-secret-value", {
      homeDir,
      platform: "posix",
      projectRoot,
    });
    const second = await writeManagedSecret(deps, "gp-secret-value", {
      homeDir,
      platform: "posix",
      projectRoot,
    });
    assert.equal(second.changed, false);
    assert.equal(second.repairedPermissions, true);

    const third = await writeManagedSecret(deps, "gp-new-secret", {
      homeDir,
      platform: "posix",
      projectRoot,
    });
    assert.equal(third.changed, true);
  } finally {
    deps.cleanup();
  }
});

test("managed secret storage rejects repository-local and out-of-profile Windows paths", async () => {
  const repoLocal = createTestDeps();
  const projectRoot = join(repoLocal.root, "project");
  await assert.rejects(
    () =>
      writeManagedSecret(repoLocal, "gp-secret-value", {
        homeDir: projectRoot,
        platform: "posix",
        projectRoot,
      }),
    {
      code: "secret_storage_failed",
      message: "Managed secret and state files must not be repository-local.",
      name: "InstallerError",
    },
  );
  await assert.rejects(
    () =>
      writeManagedSecret(repoLocal, "gp-secret-value", {
        homeDir: join(projectRoot, "..managed"),
        platform: "posix",
        projectRoot,
      }),
    {
      code: "secret_storage_failed",
      message: "Managed secret and state files must not be repository-local.",
      name: "InstallerError",
    },
  );
  repoLocal.cleanup();

  const windows = createTestDeps();
  const managed = resolveManagedPaths("D:/OtherUser");
  assert.match(managed.secretPath, /api-key/);
  await assert.rejects(
    () =>
      writeManagedSecret(windows, "gp-secret-value", {
        homeDir: "D:/OtherUser",
        platform: "windows",
        projectRoot: "C:/repo",
        userProfile: "C:/Users/Current",
      }),
    {
      code: "secret_storage_failed",
      message:
        "Managed Windows files must stay inside the current user profile.",
      name: "InstallerError",
    },
  );
  windows.cleanup();
});

test("managed secret storage rejects missing profile home before falling back to cwd", () => {
  assert.equal(
    resolveManagedHomeDir({ HOME: "", USERPROFILE: "C:/Users/Current" }),
    "C:/Users/Current",
  );
  assert.throws(() => resolveManagedHomeDir({}), {
    code: "secret_storage_failed",
    message:
      "Cannot resolve GonkaGate managed storage without HOME or USERPROFILE.",
    name: "InstallerError",
  });
});
