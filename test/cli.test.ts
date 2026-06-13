import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import test from "node:test";
import { renderCliEntrypointError, run } from "../src/cli.js";
import { parseCliOptions } from "../src/cli/parse.js";
import { CONTRACT_METADATA } from "../src/constants/contract.js";
import {
  CURRENT_PROVIDER_PACKAGE,
  GONKAGATE_BASE_URL,
} from "../src/constants/gateway.js";
import type { CuratedModelRegistry } from "../src/constants/models.js";
import { escapeRegExp, repoRoot } from "./contract-helpers.js";
import { createTestDeps } from "./install/test-deps.js";

interface BufferWriter {
  contents: string;
  write(text: string): boolean;
}

function createBufferWriter(): BufferWriter {
  return {
    contents: "",
    write(text) {
      this.contents += text;
      return true;
    },
  };
}

const validatedRegistry = {
  alpha: {
    adapterPackage: CURRENT_PROVIDER_PACKAGE,
    displayName: "Alpha",
    modelId: "provider/alpha",
    recommended: true,
    transport: "chat_completions",
    validationStatus: "validated",
  },
} as const satisfies CuratedModelRegistry;

function queueCliSuccess(
  deps: ReturnType<typeof createTestDeps>,
  configDir: string,
) {
  const resolved = JSON.stringify({
    model: "gonkagate/alpha",
    small_model: "gonkagate/alpha",
    provider: {
      gonkagate: {
        npm: CURRENT_PROVIDER_PACKAGE,
        options: { baseURL: GONKAGATE_BASE_URL, apiKey: "gp-secret-value" },
        models: { alpha: { name: "Alpha" } },
      },
    },
  });
  deps.queueCommand({ exitCode: 0, stderr: "", stdout: "mimo 0.1.0\n" });
  deps.queueCommand({
    exitCode: 0,
    stderr: "",
    stdout: JSON.stringify({ config: configDir }),
  });
  deps.queueCommand({ exitCode: 0, stderr: "", stdout: resolved });
  deps.queueCommand({ exitCode: 0, stderr: "", stdout: "gonkagate/alpha\n" });
  deps.queueCommand({ exitCode: 0, stderr: "", stdout: resolved });
}

test("CLI wrapper exposes the scaffolded help surface", () => {
  const binPath = resolve(repoRoot, CONTRACT_METADATA.binPath);
  const helpResult = spawnSync(process.execPath, [binPath, "--help"], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  assert.equal(helpResult.status, 0);
  assert.match(helpResult.stdout, /Usage: mimo-code-setup/i);
  assert.match(helpResult.stdout, /Configure GonkaGate for MiMoCode/i);
  assert.match(helpResult.stdout, /Safe secret inputs/i);
  assert.match(
    helpResult.stdout,
    new RegExp(escapeRegExp(CONTRACT_METADATA.publicEntrypoint)),
  );
  assert.match(helpResult.stdout, new RegExp(escapeRegExp(GONKAGATE_BASE_URL)));
});

test("CLI wrapper exposes the package version", () => {
  const binPath = resolve(repoRoot, CONTRACT_METADATA.binPath);
  const versionResult = spawnSync(process.execPath, [binPath, "--version"], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  assert.equal(versionResult.status, 0);
  assert.equal(versionResult.stdout.trim(), CONTRACT_METADATA.cliVersion);
});

test("default CLI run reaches secret intake before live model catalog fetch", async () => {
  const deps = createTestDeps();
  deps.setCwd(`${deps.root}/project`);
  deps.setEnv({ HOME: `${deps.root}/home` });
  deps.streams.stdin.isTTY = false;
  deps.streams.stdout.isTTY = false;
  deps.queueCommand({ exitCode: 0, stderr: "", stdout: "mimo 0.1.0\n" });
  deps.queueCommand({
    exitCode: 0,
    stderr: "",
    stdout: JSON.stringify({ config: `${deps.root}/home/.config/mimocode` }),
  });
  const stdout = createBufferWriter();

  try {
    const result = await run(["--yes"], { deps, stdout });

    assert.equal(result.exitCode, 1);
    assert.equal(result.status, "blocked");
    assert.match(stdout.contents, /GonkaGate API key is required/i);
    assert.doesNotMatch(stdout.contents, /validated_models_unavailable/i);
    assert.doesNotMatch(stdout.contents, /success/i);
  } finally {
    deps.cleanup();
  }
});

test("--json reports structured setup blockers before live model catalog fetch", async () => {
  const deps = createTestDeps();
  deps.setCwd(`${deps.root}/project`);
  deps.setEnv({ HOME: `${deps.root}/home` });
  deps.streams.stdin.isTTY = false;
  deps.streams.stdout.isTTY = false;
  deps.queueCommand({ exitCode: 0, stderr: "", stdout: "mimo 0.1.0\n" });
  deps.queueCommand({
    exitCode: 0,
    stderr: "",
    stdout: JSON.stringify({ config: `${deps.root}/home/.config/mimocode` }),
  });
  const stdout = createBufferWriter();

  try {
    const result = await run(["--yes", "--json"], { deps, stdout });
    const parsed = JSON.parse(stdout.contents) as {
      errorCode: string;
      status: string;
    };

    assert.equal(result.exitCode, 1);
    assert.equal(parsed.status, "blocked");
    assert.equal(parsed.errorCode, "non_interactive_secret_required");
  } finally {
    deps.cleanup();
  }
});

test("entrypoint error rendering redacts GonkaGate API keys", () => {
  const rendered = renderCliEntrypointError(
    new Error("failed with gp-test-secret-value"),
  );

  assert.equal(rendered.exitCode, 1);
  assert.match(rendered.stderrText, /gp-\[redacted\]/);
  assert.doesNotMatch(rendered.stderrText, /gp-test-secret-value/);
});

test("CLI parser rejects plain --api-key before secret handling", () => {
  assert.throws(
    () => parseCliOptions(["--api-key=gp-test-secret-value"]),
    /Plain --api-key is not supported/,
  );
});

test("CLI can render JSON success and human Next command with injected registry", async () => {
  const deps = createTestDeps();
  deps.setCwd(`${deps.root}/project`);
  deps.setEnv({ HOME: `${deps.root}/home` });
  deps.setStdin("gp-secret-value\n");
  queueCliSuccess(deps, `${deps.root}/home/.config/mimocode`);

  try {
    const jsonOut = createBufferWriter();
    const jsonResult = await run(
      [
        "--yes",
        "--scope",
        "user",
        "--model",
        "alpha",
        "--api-key-stdin",
        "--json",
      ],
      { deps, registry: validatedRegistry, stdout: jsonOut },
    );
    const parsed = JSON.parse(jsonOut.contents) as {
      status: string;
      model: string;
    };
    assert.equal(jsonResult.exitCode, 0);
    assert.equal(parsed.status, "success");
    assert.equal(parsed.model, "alpha");
  } finally {
    deps.cleanup();
  }

  const humanDeps = createTestDeps();
  humanDeps.setCwd(`${humanDeps.root}/project`);
  humanDeps.setEnv({ HOME: `${humanDeps.root}/home` });
  humanDeps.setStdin("gp-secret-value\n");
  queueCliSuccess(humanDeps, `${humanDeps.root}/home/.config/mimocode`);
  try {
    const stdout = createBufferWriter();
    const result = await run(
      ["--yes", "--scope", "user", "--model", "alpha", "--api-key-stdin"],
      { deps: humanDeps, registry: validatedRegistry, stdout },
    );
    assert.equal(result.exitCode, 0);
    assert.match(stdout.contents, /Next: mimo/);
  } finally {
    humanDeps.cleanup();
  }
});

test("CLI JSON renders failed and storage-blocker outcomes without secrets", async () => {
  const failedDeps = createTestDeps();
  failedDeps.setCwd(`${failedDeps.root}/project`);
  failedDeps.setEnv({
    HOME: `${failedDeps.root}/home`,
    GONKAGATE_API_KEY: "gp-secret-value",
  });
  failedDeps.queueCommand({ exitCode: 0, stderr: "", stdout: "mimo 0.1.0\n" });
  failedDeps.queueCommand({
    exitCode: 0,
    stderr: "",
    stdout: JSON.stringify({
      config: `${failedDeps.root}/home/.config/mimocode`,
    }),
  });
  failedDeps.queueCommand({
    exitCode: 1,
    stderr: "debug failed gp-secret-value",
    stdout: "",
  });
  failedDeps.queueCommand({
    exitCode: 0,
    stderr: "",
    stdout: "gonkagate/alpha\n",
  });
  try {
    const stdout = createBufferWriter();
    const result = await run(
      ["--yes", "--scope", "user", "--model", "alpha", "--json"],
      { deps: failedDeps, registry: validatedRegistry, stdout },
    );
    const parsed = JSON.parse(stdout.contents) as { status: string };
    assert.equal(result.status, "failed");
    assert.equal(parsed.status, "failed");
    assert.doesNotMatch(stdout.contents, /gp-secret-value/);
  } finally {
    failedDeps.cleanup();
  }

  const storageDeps = createTestDeps();
  storageDeps.setCwd(`${storageDeps.root}/project`);
  storageDeps.setEnv({ GONKAGATE_API_KEY: "gp-secret-value" });
  storageDeps.queueCommand({
    exitCode: 0,
    stderr: "",
    stdout: "mimo 0.1.0\n",
  });
  storageDeps.queueCommand({
    exitCode: 0,
    stderr: "",
    stdout: JSON.stringify({
      config: `${storageDeps.root}/project/.config/mimocode`,
    }),
  });
  try {
    const stdout = createBufferWriter();
    const result = await run(
      ["--yes", "--scope", "user", "--model", "alpha", "--json"],
      { deps: storageDeps, registry: validatedRegistry, stdout },
    );
    const parsed = JSON.parse(stdout.contents) as {
      status: string;
      errorCode: string;
    };
    assert.equal(result.status, "blocked");
    assert.equal(parsed.status, "blocked");
    assert.equal(parsed.errorCode, "secret_storage_failed");
    assert.doesNotMatch(stdout.contents, /gp-secret-value/);
  } finally {
    storageDeps.cleanup();
  }
});
