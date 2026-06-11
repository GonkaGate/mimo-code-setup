import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { createNodeCommandExecutor } from "../../src/install/deps.js";
import { createFakeMimoHarness } from "./harness.js";

test("fake mimo harness isolates command execution and captures secret output", () => {
  const harness = createFakeMimoHarness([
    { args: ["--version"], stdout: "mimo 0.1.0\n" },
    {
      args: ["debug", "paths"],
      stdout: JSON.stringify({
        config: "/fake/home/.config/mimocode",
        data: "/fake/home/.local/share/mimocode",
      }),
    },
    {
      args: ["--pure", "debug", "config"],
      stdout: JSON.stringify({
        provider: { gonkagate: { options: { apiKey: "gp-secret-value" } } },
      }),
    },
    { args: ["models", "gonkagate"], stdout: "gonkagate/test-model\n" },
  ]);

  try {
    const version = spawnSync("mimo", ["--version"], {
      encoding: "utf8",
      env: { ...process.env, ...harness.env },
    });
    assert.equal(version.status, 0);
    assert.equal(version.stdout, "mimo 0.1.0\n");
    assert.match(harness.homeDir, /mimo-code-setup-/);
    assert.match(harness.projectDir, /mimo-code-setup-/);

    const paths = spawnSync("mimo", ["debug", "paths"], {
      encoding: "utf8",
      env: { ...process.env, ...harness.env },
    });
    assert.equal(paths.status, 0);
    assert.match(paths.stdout, /mimocode/);

    const debugConfig = spawnSync("mimo", ["--pure", "debug", "config"], {
      encoding: "utf8",
      env: { ...process.env, ...harness.env },
    });
    assert.equal(debugConfig.status, 0);
    assert.match(debugConfig.stdout, /gp-secret-value/);
  } finally {
    harness.cleanup();
  }
});

test("fake mimo harness works through the Node command executor", async () => {
  const harness = createFakeMimoHarness([
    { args: ["models", "gonkagate"], stdout: "gonkagate/test-model\n" },
  ]);

  try {
    const result = await createNodeCommandExecutor().run(
      "mimo",
      ["models", "gonkagate"],
      {
        env: { ...process.env, ...harness.env },
      },
    );

    assert.equal(result.exitCode, 0);
    assert.equal(result.stdout, "gonkagate/test-model\n");
  } finally {
    harness.cleanup();
  }
});
