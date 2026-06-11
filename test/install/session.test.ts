import assert from "node:assert/strict";
import { join } from "node:path";
import test from "node:test";
import { CURRENT_PROVIDER_PACKAGE } from "../../src/constants/gateway.js";
import type { CuratedModelRegistry } from "../../src/constants/models.js";
import { runInstallSession } from "../../src/install/session.js";
import { createTestDeps } from "./test-deps.js";

const registry = {
  alpha: {
    adapterPackage: CURRENT_PROVIDER_PACKAGE,
    displayName: "Alpha",
    modelId: "provider/alpha",
    recommended: true,
    transport: "chat_completions",
    validationStatus: "validated",
  },
} as const satisfies CuratedModelRegistry;

function matchingConfig() {
  return JSON.stringify({
    model: "gonkagate/alpha",
    small_model: "gonkagate/alpha",
    provider: {
      gonkagate: {
        npm: CURRENT_PROVIDER_PACKAGE,
        options: {
          baseURL: "https://api.gonkagate.com/v1",
          apiKey: "gp-secret-value",
        },
        models: { alpha: { name: "Alpha" } },
      },
    },
  });
}

function matchingLiveConfig() {
  return JSON.stringify({
    model: "gonkagate/moonshotai/kimi-k2.6",
    small_model: "gonkagate/moonshotai/kimi-k2.6",
    provider: {
      gonkagate: {
        npm: CURRENT_PROVIDER_PACKAGE,
        options: {
          baseURL: "https://api.gonkagate.com/v1",
          apiKey: "gp-secret-value",
        },
        models: {
          "moonshotai/kimi-k2.6": { name: "moonshotai/kimi-k2.6" },
          "minimaxai/minimax-m2.7": { name: "minimaxai/minimax-m2.7" },
          "qwen/qwen3-235b-a22b-instruct-2507-fp8": {
            name: "qwen/qwen3-235b-a22b-instruct-2507-fp8",
          },
        },
      },
    },
  });
}

function prepareDeps() {
  const deps = createTestDeps();
  const home = join(deps.root, "home");
  const project = join(deps.root, "project");
  deps.setCwd(project);
  deps.setEnv({ GONKAGATE_API_KEY: "gp-secret-value", HOME: home });
  return { deps, home, project };
}

function queueSuccessfulCommands(
  deps: ReturnType<typeof createTestDeps>,
  configDir: string,
) {
  deps.queueCommand({ exitCode: 0, stderr: "", stdout: "mimo 0.1.0\n" });
  deps.queueCommand({
    exitCode: 0,
    stderr: "",
    stdout: JSON.stringify({ config: configDir }),
  });
  deps.queueCommand({ exitCode: 0, stderr: "", stdout: matchingConfig() });
  deps.queueCommand({ exitCode: 0, stderr: "", stdout: "gonkagate/alpha\n" });
  deps.queueCommand({ exitCode: 0, stderr: "", stdout: matchingConfig() });
}

function queueSuccessfulLiveCommands(
  deps: ReturnType<typeof createTestDeps>,
  configDir: string,
) {
  deps.queueCommand({ exitCode: 0, stderr: "", stdout: "mimo 0.1.0\n" });
  deps.queueCommand({
    exitCode: 0,
    stderr: "",
    stdout: JSON.stringify({ config: configDir }),
  });
  deps.queueCommand({ exitCode: 0, stderr: "", stdout: matchingLiveConfig() });
  deps.queueCommand({
    exitCode: 0,
    stderr: "",
    stdout: "gonkagate/moonshotai/kimi-k2.6\n",
  });
  deps.queueCommand({ exitCode: 0, stderr: "", stdout: matchingLiveConfig() });
}

test("install session succeeds for user scope with fake mimo and writes state after durable verification", async () => {
  const { deps, home } = prepareDeps();
  const configDir = join(home, ".config", "mimocode");
  queueSuccessfulCommands(deps, configDir);

  try {
    const result = await runInstallSession(
      { registry, scope: "user", yes: true },
      deps,
    );

    assert.equal(result.status, "success");
    assert.equal(result.ok, true);
    assert.equal(result.model, "alpha");
    assert.match(
      await deps.fs.readText(join(configDir, "mimocode.jsonc")),
      /gonkagate\/alpha/,
    );
    assert.match(
      await deps.fs.readText(
        join(home, ".gonkagate", "mimo-code", "install-state.json"),
      ),
      /lastDurableSetupAt/,
    );
  } finally {
    deps.cleanup();
  }
});

test("install session fetches the live GonkaGate catalog and writes every returned model", async () => {
  const { deps, home } = prepareDeps();
  const configDir = join(home, ".config", "mimocode");
  queueSuccessfulLiveCommands(deps, configDir);
  deps.queueHttpResponse({
    body: {
      data: [
        { id: "moonshotai/kimi-k2.6", object: "model" },
        { id: "minimaxai/minimax-m2.7", object: "model" },
        { id: "qwen/qwen3-235b-a22b-instruct-2507-fp8", object: "model" },
      ],
      object: "list",
    },
    status: 200,
  });

  try {
    const result = await runInstallSession({ scope: "user", yes: true }, deps);
    const globalConfig = await deps.fs.readText(
      join(configDir, "mimocode.jsonc"),
    );

    assert.equal(result.status, "success");
    assert.equal(result.ok, true);
    assert.equal(result.model, "moonshotai/kimi-k2.6");
    assert.match(globalConfig, /moonshotai\/kimi-k2\.6/);
    assert.match(globalConfig, /minimaxai\/minimax-m2\.7/);
    assert.match(globalConfig, /qwen\/qwen3-235b-a22b-instruct-2507-fp8/);
  } finally {
    deps.cleanup();
  }
});

test("install session writes project activation only for project scope", async () => {
  const { deps, home, project } = prepareDeps();
  const configDir = join(home, ".config", "mimocode");
  queueSuccessfulCommands(deps, configDir);

  try {
    const result = await runInstallSession(
      { registry, scope: "project", yes: true },
      deps,
    );

    assert.equal(result.status, "success");
    const projectConfig = await deps.fs.readText(
      join(project, ".mimocode", "mimocode.json"),
    );
    assert.match(projectConfig, /gonkagate\/alpha/);
    assert.doesNotMatch(projectConfig, /apiKey/);
  } finally {
    deps.cleanup();
  }
});

test("install session rolls back config writes when durable verification fails", async () => {
  const { deps, home } = prepareDeps();
  const configDir = join(home, ".config", "mimocode");
  deps.queueCommand({ exitCode: 0, stderr: "", stdout: "mimo 0.1.0\n" });
  deps.queueCommand({
    exitCode: 0,
    stderr: "",
    stdout: JSON.stringify({ config: configDir }),
  });
  deps.queueCommand({
    exitCode: 0,
    stderr: "",
    stdout: JSON.stringify({ model: "other/model" }),
  });
  deps.queueCommand({ exitCode: 0, stderr: "", stdout: "gonkagate/alpha\n" });

  try {
    const result = await runInstallSession(
      { registry, scope: "user", yes: true },
      deps,
    );

    assert.equal(result.status, "failed");
    assert.equal(
      await deps.fs.pathExists(join(configDir, "mimocode.jsonc")),
      false,
    );
  } finally {
    deps.cleanup();
  }
});

test("install session reports current-session block after durable success without rolling back state", async () => {
  const { deps, home } = prepareDeps();
  const configDir = join(home, ".config", "mimocode");
  deps.setEnv({
    GONKAGATE_API_KEY: "gp-secret-value",
    HOME: home,
    MIMOCODE_CONFIG_CONTENT: '{"model":"other/model"}',
  });
  deps.queueCommand({ exitCode: 0, stderr: "", stdout: "mimo 0.1.0\n" });
  deps.queueCommand({
    exitCode: 0,
    stderr: "",
    stdout: JSON.stringify({ config: configDir }),
  });
  deps.queueCommand({ exitCode: 0, stderr: "", stdout: matchingConfig() });
  deps.queueCommand({ exitCode: 0, stderr: "", stdout: "gonkagate/alpha\n" });
  deps.queueCommand({
    exitCode: 0,
    stderr: "",
    stdout: JSON.stringify({ model: "other/model" }),
  });

  try {
    const result = await runInstallSession(
      { registry, scope: "user", yes: true },
      deps,
    );

    assert.equal(result.status, "blocked");
    assert.match(JSON.stringify(result), /runtime_override_conflict/);
    assert.equal(
      await deps.fs.pathExists(
        join(home, ".gonkagate", "mimo-code", "install-state.json"),
      ),
      true,
    );
  } finally {
    deps.cleanup();
  }
});
