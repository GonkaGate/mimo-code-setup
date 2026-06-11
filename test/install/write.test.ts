import assert from "node:assert/strict";
import { join } from "node:path";
import test from "node:test";
import { ManagedWriteTransaction } from "../../src/install/managed-write-transaction.js";
import { runRollback } from "../../src/install/rollback.js";
import { writeManagedFile } from "../../src/install/write.js";
import { createTestDeps } from "./test-deps.js";

test("managed writes create files atomically and delete created files on rollback", async () => {
  const deps = createTestDeps();

  try {
    const targetPath = join(deps.root, "config", "mimocode.jsonc");
    const result = await writeManagedFile(deps, {
      backupRoot: join(deps.root, "backups"),
      contents: "{}\n",
      targetPath,
      timestamp: deps.clock.now(),
    });

    assert.equal(result.changed, true);
    assert.equal(await deps.fs.readText(targetPath), "{}\n");
    assert.equal(result.rollbackAction?.kind, "delete_created");
    await runRollback(
      deps,
      result.rollbackAction === undefined ? [] : [result.rollbackAction],
    );
    assert.equal(await deps.fs.pathExists(targetPath), false);
  } finally {
    deps.cleanup();
  }
});

test("managed writes back up replacements, skip no-ops, and restore backups", async () => {
  const deps = createTestDeps();

  try {
    const targetPath = join(deps.root, "config", "mimocode.jsonc");
    await deps.fs.writeText(targetPath, "old\n");
    const replace = await writeManagedFile(deps, {
      backupRoot: join(deps.root, "backups"),
      contents: "new\n",
      targetPath,
      timestamp: deps.clock.now(),
    });

    assert.equal(replace.changed, true);
    assert.match(replace.backupPath ?? "", /mimocode\.jsonc/);
    assert.equal(await deps.fs.readText(targetPath), "new\n");
    await runRollback(
      deps,
      replace.rollbackAction === undefined ? [] : [replace.rollbackAction],
    );
    assert.equal(await deps.fs.readText(targetPath), "old\n");

    const noOp = await writeManagedFile(deps, {
      backupRoot: join(deps.root, "backups"),
      contents: "old\n",
      targetPath,
      timestamp: deps.clock.now(),
    });
    assert.equal(noOp.changed, false);
    assert.equal(noOp.backupPath, undefined);
  } finally {
    deps.cleanup();
  }
});

test("project config backups are relocated under the managed project-config backup root", async () => {
  const deps = createTestDeps();

  try {
    const targetPath = join(deps.root, "repo", ".mimocode", "mimocode.json");
    await deps.fs.writeText(targetPath, "old\n");
    const result = await writeManagedFile(deps, {
      backupRoot: join(deps.root, ".gonkagate", "mimo-code", "backups"),
      contents: "new\n",
      projectScoped: true,
      targetPath,
      timestamp: deps.clock.now(),
    });

    assert.match(result.backupPath ?? "", /backups\/project-config\//);
    assert.doesNotMatch(result.backupPath ?? "", /repo\/\.mimocode/);
  } finally {
    deps.cleanup();
  }
});

test("managed write transaction records rollback actions", async () => {
  const deps = createTestDeps();

  try {
    const transaction = new ManagedWriteTransaction(deps);
    const targetPath = join(deps.root, "state.json");
    await transaction.write({
      backupRoot: join(deps.root, "backups"),
      contents: "{}\n",
      targetPath,
      timestamp: deps.clock.now(),
    });
    await transaction.rollback();
    assert.equal(await deps.fs.pathExists(targetPath), false);
  } finally {
    deps.cleanup();
  }
});
