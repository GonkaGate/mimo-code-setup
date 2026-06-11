import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createNodeCommandExecutor,
  createNodeFileSystem,
} from "../../src/install/deps.js";
import {
  classifyRuntimePlatform,
  isNativeWindowsProfilePath,
  normalizeExecutableCandidates,
  normalizeGitBashWindowsPath,
} from "../../src/install/platform-path.js";

test("node filesystem adapter handles text, mkdir, stat, chmod, copy, rename, and rm", async () => {
  const root = mkdtempSync(join(tmpdir(), "mimo-code-setup-fs-"));
  const fs = createNodeFileSystem();

  try {
    const source = join(root, "nested", "file.txt");
    const copy = join(root, "copy.txt");
    const renamed = join(root, "renamed.txt");

    await fs.writeText(source, "hello", { mode: 0o600 });
    assert.equal(await fs.pathExists(source), true);
    assert.equal(await fs.readText(source), "hello");

    const stat = await fs.stat(source);
    assert.equal(stat.isFile(), true);
    await fs.chmod(source, 0o600);
    await fs.copyFile(source, copy);
    await fs.rename(copy, renamed);
    assert.equal(await fs.pathExists(renamed), true);
    await fs.rm(renamed, { force: true });
    assert.equal(await fs.pathExists(renamed), false);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test("node command executor captures stdout, stderr, input, and failures", async () => {
  const executor = createNodeCommandExecutor();
  const result = await executor.run(
    process.execPath,
    [
      "-e",
      "process.stdin.on('data', d => process.stdout.write(String(d).trim())); process.stderr.write('warn')",
    ],
    { input: "ok\n" },
  );

  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "ok");
  assert.equal(result.stderr, "warn");
});

test("platform helpers classify POSIX, WSL, Windows, and command shims", () => {
  assert.equal(classifyRuntimePlatform({ platform: "darwin" }), "posix");
  assert.equal(
    classifyRuntimePlatform({
      platform: "linux",
      release: "microsoft-standard",
    }),
    "wsl",
  );
  assert.equal(classifyRuntimePlatform({ platform: "win32" }), "windows");
  assert.deepEqual(normalizeExecutableCandidates("mimo", "posix"), ["mimo"]);
  assert.deepEqual(normalizeExecutableCandidates("mimo", "windows"), [
    "mimo",
    "mimo.cmd",
    "mimo.exe",
  ]);
  assert.equal(
    isNativeWindowsProfilePath(
      "C:/Users/A/.gonkagate/mimo-code/api-key",
      "C:/Users/A",
    ),
    true,
  );
  assert.equal(
    normalizeGitBashWindowsPath("/c/Users/A/.gonkagate/mimo-code/api-key"),
    "C:\\Users\\A\\.gonkagate\\mimo-code\\api-key",
  );
  assert.equal(
    isNativeWindowsProfilePath(
      "/c/Users/A/.gonkagate/mimo-code/api-key",
      "C:/Users/A",
    ),
    true,
  );
});
