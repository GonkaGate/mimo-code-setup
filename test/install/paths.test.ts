import assert from "node:assert/strict";
import { basename, join } from "node:path";
import test from "node:test";
import {
  GLOBAL_CONFIG_MERGE_FILENAMES,
  parseMimoDebugPaths,
  resolveMimoGlobalPaths,
  resolveProjectConfigLayers,
  resolveProjectRoot,
  selectGlobalConfigTarget,
} from "../../src/install/paths.js";
import { listInspectableConfigLayers } from "../../src/install/verify-layers.js";
import { createTestDeps } from "./test-deps.js";

test("parseMimoDebugPaths supports JSON and key-value output", () => {
  assert.deepEqual(
    parseMimoDebugPaths(
      JSON.stringify({ config: "/tmp/config", data: "/tmp/data" }),
    ),
    { configDir: "/tmp/config", dataDir: "/tmp/data" },
  );
  assert.deepEqual(
    parseMimoDebugPaths("Config: /tmp/config\nState: /tmp/state"),
    {
      configDir: "/tmp/config",
      stateDir: "/tmp/state",
    },
  );
});

test("resolveMimoGlobalPaths prefers mimo debug paths and falls back to XDG/MIMOCODE_HOME", async () => {
  const debug = createTestDeps();
  debug.queueCommand({
    exitCode: 0,
    stderr: "",
    stdout: JSON.stringify({ cache: "/debug/cache", config: "/debug/config" }),
  });
  assert.equal(
    (await resolveMimoGlobalPaths(debug)).configDir,
    "/debug/config",
  );
  debug.cleanup();

  const xdg = createTestDeps();
  const xdgConfig = join(xdg.root, "xdg", "config");
  xdg.setEnv({ HOME: join(xdg.root, "home"), XDG_CONFIG_HOME: xdgConfig });
  xdg.queueCommand({ exitCode: 1, stderr: "no debug", stdout: "" });
  assert.equal(
    (await resolveMimoGlobalPaths(xdg)).configDir,
    join(xdgConfig, "mimocode"),
  );
  xdg.cleanup();

  const mimoHome = createTestDeps();
  const mimoHomeRoot = join(mimoHome.root, "mimo-home");
  mimoHome.setEnv({
    HOME: join(mimoHome.root, "home"),
    MIMOCODE_HOME: mimoHomeRoot,
  });
  mimoHome.queueCommand({ exitCode: 1, stderr: "no debug", stdout: "" });
  assert.equal(
    (await resolveMimoGlobalPaths(mimoHome)).configDir,
    join(mimoHomeRoot, "config"),
  );
  mimoHome.cleanup();
});

test("selectGlobalConfigTarget preserves existing candidates and exposes merge order", async () => {
  const deps = createTestDeps();
  const configDir = join(deps.root, "config");

  try {
    let target = await selectGlobalConfigTarget(deps, configDir);
    assert.equal(target.targetPath, join(configDir, "mimocode.jsonc"));

    await deps.fs.writeText(join(configDir, "config.json"), "{}\n");
    target = await selectGlobalConfigTarget(deps, configDir);
    assert.equal(target.targetPath, join(configDir, "config.json"));

    await deps.fs.writeText(join(configDir, "mimocode.json"), "{}\n");
    await deps.fs.writeText(join(configDir, "mimocode.jsonc"), "{}\n");
    target = await selectGlobalConfigTarget(deps, configDir);
    assert.equal(target.targetPath, join(configDir, "mimocode.jsonc"));
    assert.deepEqual(
      target.candidatesInMergeOrder.map((path) => basename(path)),
      [...GLOBAL_CONFIG_MERGE_FILENAMES],
    );
  } finally {
    deps.cleanup();
  }
});

test("project root and local layer resolution cover git root, cwd fallback, and disable/config-dir behavior", async () => {
  const deps = createTestDeps();

  try {
    const project = join(deps.root, "repo");
    const nested = join(project, "a", "b");
    await deps.fs.writeText(join(project, ".git", "HEAD"), "ref: main\n");
    await deps.fs.writeText(join(nested, ".keep"), "");

    const gitRoot = await resolveProjectRoot(deps, nested);
    assert.deepEqual(gitRoot, { discovery: "git", projectRoot: project });

    const fallback = await resolveProjectRoot(deps, join(deps.root, "no-git"));
    assert.equal(fallback.discovery, "cwd");

    const layers = resolveProjectConfigLayers(project, {
      MIMOCODE_CONFIG_DIR: join(project, "managed"),
      MIMOCODE_DISABLE_PROJECT_CONFIG: "1",
    });
    assert.equal(layers.disabledProjectConfig, true);
    assert.deepEqual(layers.rootLayers, []);
    assert.equal(layers.configDirLayers.length, 3);

    const inspectable = listInspectableConfigLayers({
      env: {
        MIMOCODE_CONFIG: "/override.json",
        MIMOCODE_CONFIG_CONTENT: "{}",
      },
      globalCandidates: ["/global/config.json"],
      projectRoot: project,
    });
    assert.equal(inspectable.runtimeConfigPath, "/override.json");
    assert.equal(inspectable.runtimeConfigContentPresent, true);
  } finally {
    deps.cleanup();
  }
});
