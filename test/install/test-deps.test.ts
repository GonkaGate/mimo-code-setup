import assert from "node:assert/strict";
import { join } from "node:path";
import test from "node:test";
import { createTestDeps } from "./test-deps.js";

test("test deps simulate env, cwd, clock, filesystem, and command results", async () => {
  const deps = createTestDeps();

  try {
    const cwd = join(deps.root, "project");
    deps.setCwd(cwd);
    deps.setEnv({ GONKAGATE_API_KEY: "gp-test-secret-value" });
    deps.queueCommand({ exitCode: 2, stderr: "boom", stdout: "out" });

    const filePath = join(cwd, "file.txt");
    await deps.fs.writeText(filePath, "contents", { mode: 0o600 });
    await deps.fs.chmod(filePath, 0o600);

    const command = await deps.commands.run("mimo", ["--version"], {
      cwd,
      env: deps.env(),
    });

    assert.equal(deps.cwd(), cwd);
    assert.equal(deps.env().GONKAGATE_API_KEY, "gp-test-secret-value");
    assert.equal(deps.clock.now().toISOString(), "2026-06-11T00:00:00.000Z");
    assert.equal(await deps.fs.readText(filePath), "contents");
    assert.deepEqual(command, { exitCode: 2, stderr: "boom", stdout: "out" });
    assert.equal(deps.commandLog[0]?.command, "mimo");
    assert.deepEqual(deps.commandLog[0]?.args, ["--version"]);
  } finally {
    deps.cleanup();
  }
});
