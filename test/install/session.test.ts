import assert from "node:assert/strict";
import { join } from "node:path";
import test from "node:test";
import { CURRENT_PROVIDER_PACKAGE } from "../../src/constants/gateway.js";
import type { ModelRegistry } from "../../src/constants/models.js";
import { runInstallSession } from "../../src/install/session.js";
import { createTestDeps } from "./test-deps.js";

const registry = {
  alpha: {
    adapterPackage: CURRENT_PROVIDER_PACKAGE,
    displayName: "Alpha",
    modelId: "provider/alpha",
    transport: "chat_completions",
    validationStatus: "validated",
  },
} as const satisfies ModelRegistry;

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

function getWrittenModels(contents: string): Record<string, unknown> {
  const parsed = JSON.parse(contents) as {
    provider: { gonkagate: { models: Record<string, unknown> } };
  };
  return parsed.provider.gonkagate.models;
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
  deps.queueCommand({ exitCode: 0, stderr: "", stdout: "mimo 0.1.2\n" });
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
  deps.queueCommand({ exitCode: 0, stderr: "", stdout: "mimo 0.1.2\n" });
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
    const written = getWrittenModels(globalConfig);

    assert.equal(result.status, "success");
    assert.equal(result.ok, true);
    assert.equal(result.model, "moonshotai/kimi-k2.6");
    assert.deepEqual(Object.keys(written), [
      "moonshotai/kimi-k2.6",
      "minimaxai/minimax-m2.7",
      "qwen/qwen3-235b-a22b-instruct-2507-fp8",
    ]);
    assert.deepEqual(written["moonshotai/kimi-k2.6"], {
      name: "moonshotai/kimi-k2.6",
    });
    assert.doesNotMatch(globalConfig, /"context"/);
  } finally {
    deps.cleanup();
  }
});

test("install session carries live model name and context window into MiMoCode config", async () => {
  const { deps, home } = prepareDeps();
  const configDir = join(home, ".config", "mimocode");
  queueSuccessfulLiveCommands(deps, configDir);
  deps.queueHttpResponse({
    body: {
      data: [
        {
          context_length: 240_000,
          created: 1_753_920_000,
          description: "Long-context coding model.",
          id: "moonshotai/kimi-k2.6",
          name: "Kimi K2.6",
          object: "model",
          owned_by: "gonka",
        },
        {
          context_length: null,
          id: "minimaxai/minimax-m2.7",
          object: "model",
          owned_by: "gonka",
        },
        {
          context_length: 180_000,
          id: "qwen/qwen3-235b-a22b-instruct-2507-fp8",
          name: "Qwen3 235B",
          object: "model",
          owned_by: "gonka",
        },
      ],
      object: "list",
    },
    status: 200,
  });

  try {
    const result = await runInstallSession({ scope: "user", yes: true }, deps);
    const written = getWrittenModels(
      await deps.fs.readText(join(configDir, "mimocode.jsonc")),
    );

    assert.equal(result.status, "success");
    assert.equal(result.model, "moonshotai/kimi-k2.6");
    assert.deepEqual(written["moonshotai/kimi-k2.6"], {
      limit: { context: 240_000, output: 0 },
      name: "Kimi K2.6",
    });
    assert.deepEqual(written["minimaxai/minimax-m2.7"], {
      name: "minimaxai/minimax-m2.7",
    });
    assert.deepEqual(written["qwen/qwen3-235b-a22b-instruct-2507-fp8"], {
      limit: { context: 180_000, output: 0 },
      name: "Qwen3 235B",
    });
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
