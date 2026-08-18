import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
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
  beta: {
    adapterPackage: CURRENT_PROVIDER_PACKAGE,
    displayName: "Beta",
    modelId: "provider/beta",
    transport: "chat_completions",
    validationStatus: "validated",
  },
} as const satisfies ModelRegistry;

function resolved(model: "alpha" | "beta") {
  return JSON.stringify({
    model: `gonkagate/${model}`,
    small_model: `gonkagate/${model}`,
    provider: {
      gonkagate: {
        npm: CURRENT_PROVIDER_PACKAGE,
        options: {
          baseURL: "https://api.gonkagate.com/v1",
          apiKey: "gp-secret-value",
        },
        models: { alpha: { name: "Alpha" }, beta: { name: "Beta" } },
      },
    },
  });
}

function queueSuccess(
  deps: ReturnType<typeof createTestDeps>,
  configDir: string,
  model: "alpha" | "beta",
) {
  deps.queueCommand({ exitCode: 0, stderr: "", stdout: "mimo 0.1.0\n" });
  deps.queueCommand({
    exitCode: 0,
    stderr: "",
    stdout: JSON.stringify({ config: configDir }),
  });
  deps.queueCommand({ exitCode: 0, stderr: "", stdout: resolved(model) });
  deps.queueCommand({
    exitCode: 0,
    stderr: "",
    stdout: `gonkagate/${model}\n`,
  });
  deps.queueCommand({ exitCode: 0, stderr: "", stdout: resolved(model) });
}

function listFilesRecursive(path: string): string[] {
  try {
    return readdirSync(path, { recursive: true }).map(String);
  } catch {
    return [];
  }
}

test("unchanged rerun is idempotent and changed rerun creates expected backups", async () => {
  const deps = createTestDeps();
  const home = join(deps.root, "home");
  const project = join(deps.root, "project");
  const configDir = join(home, ".config", "mimocode");
  deps.setCwd(project);
  deps.setEnv({ GONKAGATE_API_KEY: "gp-secret-value", HOME: home });

  try {
    queueSuccess(deps, configDir, "alpha");
    assert.equal(
      (
        await runInstallSession(
          { modelKey: "alpha", registry, scope: "user", yes: true },
          deps,
        )
      ).status,
      "success",
    );

    queueSuccess(deps, configDir, "alpha");
    assert.equal(
      (
        await runInstallSession(
          { modelKey: "alpha", registry, scope: "user", yes: true },
          deps,
        )
      ).status,
      "success",
    );
    assert.deepEqual(
      listFilesRecursive(join(home, ".gonkagate", "mimo-code", "backups")),
      [],
    );

    queueSuccess(deps, configDir, "beta");
    assert.equal(
      (
        await runInstallSession(
          { modelKey: "beta", registry, scope: "user", yes: true },
          deps,
        )
      ).status,
      "success",
    );
    assert.ok(
      listFilesRecursive(join(home, ".gonkagate", "mimo-code", "backups")).some(
        (file) => file.includes("mimocode.jsonc"),
      ),
    );
  } finally {
    deps.cleanup();
  }
});
