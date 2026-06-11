#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import process from "node:process";

const MODEL_KEY = "moonshotai/kimi-k2.6";
const MODEL_REF = `gonkagate/${MODEL_KEY}`;
const MIMO_VERSION = "0.1.0";
const SECRET_PATH =
  process.env.GONKAGATE_MIMO_KEY_FILE ??
  join(process.env.HOME ?? "", ".gonkagate", "mimo-code", "api-key");
const CLI_PATH = join(process.cwd(), "dist", "cli.js");

const secret = await readFile(SECRET_PATH, "utf8");
const roots = [];

try {
  const userInstall = await runInstall("user");
  const projectInstall = await runInstall("project");
  const runFromConfig = await runMimoJson(projectInstall, [
    "run",
    "--pure",
    "--format",
    "json",
    "Reply with exactly OK.",
  ]);
  const runWithExplicitModel = await runMimoJson(projectInstall, [
    "run",
    "--pure",
    "--model",
    MODEL_REF,
    "--format",
    "json",
    "Reply with exactly OK.",
  ]);
  const fileEdit = await runMimoJson(projectInstall, [
    "run",
    "--pure",
    "--format",
    "json",
    "--dangerously-skip-permissions",
    "Create a file named live-validation.txt in the current directory containing exactly: kimi live validation",
  ]);
  const fileContents = await readFile(
    join(projectInstall.projectDir, "live-validation.txt"),
    "utf8",
  );
  const multiTurnFirst = await runMimoJson(projectInstall, [
    "run",
    "--pure",
    "--format",
    "json",
    "Remember the validation token BLUE-FERN. Reply exactly: stored.",
  ]);
  const multiTurnSecond = await runMimoJson(projectInstall, [
    "run",
    "--pure",
    "--continue",
    "--format",
    "json",
    "What validation token did I ask you to remember? Reply with only the token.",
  ]);
  const tuiStartup = await runTuiStartupSmoke(projectInstall);

  assertInstall(userInstall.result, "user install");
  assertInstall(projectInstall.result, "project install");
  assertTextRun(runFromConfig, "mimo run from config");
  assertTextRun(runWithExplicitModel, "mimo run explicit model");
  assertTextRun(fileEdit, "file edit run");
  assert(
    fileContents.trim() === "kimi live validation",
    "file edit did not create expected content",
  );
  assertTextRun(multiTurnFirst, "multi-turn first run");
  assertTextRun(multiTurnSecond, "multi-turn continuation");
  assert(
    tuiStartup.started,
    `TUI startup smoke failed: ${tuiStartup.stderrPreview}`,
  );

  console.log(
    JSON.stringify(
      {
        modelKey: MODEL_KEY,
        modelRef: MODEL_REF,
        mimoVersion: MIMO_VERSION,
        checks: {
          userScopeInstaller: summarizeInstall(userInstall.result),
          projectScopeInstaller: summarizeInstall(projectInstall.result),
          runFromConfig,
          runWithExplicitModel,
          fileEdit: {
            ...fileEdit,
            fileCreated: true,
            fileBytes: fileContents.length,
          },
          multiTurnFirst,
          multiTurnSecond,
          tuiStartup,
        },
      },
      null,
      2,
    ),
  );
} finally {
  await Promise.all(
    roots.map((root) => rm(root, { force: true, recursive: true })),
  );
}

async function runInstall(scope) {
  const context = await createContext();
  const result = await runNode(
    [
      CLI_PATH,
      "--json",
      "--yes",
      "--scope",
      scope,
      "--model",
      MODEL_KEY,
      "--api-key-stdin",
      "--cwd",
      context.projectDir,
    ],
    context,
    secret,
  );
  const parsed = JSON.parse(result.stdout);
  assert(result.exitCode === 0, `${scope} installer exited ${result.exitCode}`);

  return {
    ...context,
    result: parsed,
  };
}

async function createContext() {
  const root = await mkdtemp(join(tmpdir(), "mimo-code-live-"));
  roots.push(root);

  const binDir = join(root, "bin");
  const homeDir = join(root, "home");
  const projectDir = join(root, "project");
  await mkdir(binDir, { recursive: true });
  await mkdir(homeDir, { recursive: true });
  await mkdir(projectDir, { recursive: true });
  await writeFile(
    join(binDir, "mimo"),
    `#!/bin/sh\nexec npx -y @mimo-ai/cli@${MIMO_VERSION} "$@"\n`,
    { mode: 0o700 },
  );

  const env = {
    ...process.env,
    PATH: [binDir, process.env.PATH ?? ""].join(delimiter),
    HOME: homeDir,
    XDG_CONFIG_HOME: join(homeDir, ".config"),
    XDG_DATA_HOME: join(homeDir, ".local", "share"),
    XDG_CACHE_HOME: join(homeDir, ".cache"),
    XDG_STATE_HOME: join(homeDir, ".local", "state"),
  };
  delete env.MIMOCODE_CONFIG;
  delete env.MIMOCODE_CONFIG_CONTENT;
  delete env.MIMOCODE_AUTH_CONTENT;
  delete env.MIMOCODE_CONFIG_DIR;
  delete env.MIMOCODE_DISABLE_PROJECT_CONFIG;

  return {
    env,
    homeDir,
    projectDir,
    root,
  };
}

async function runMimoJson(context, args) {
  const result = await runCommand("mimo", args, context);
  const summary = summarizeJsonEvents(result.stdout);

  return {
    args: args.filter((arg) => arg !== "--dangerously-skip-permissions"),
    exitCode: result.exitCode,
    stdoutBytes: result.stdout.length,
    stderrBytes: result.stderr.length,
    ...summary,
    stderrPreview: result.exitCode === 0 ? undefined : redact(result.stderr),
  };
}

async function runTuiStartupSmoke(context) {
  const child = spawn(
    "mimo",
    ["--pure", "--model", MODEL_REF, context.projectDir],
    {
      cwd: context.projectDir,
      detached: true,
      env: context.env,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  child.stdout.resume();

  const result = await new Promise((resolve) => {
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      killProcessGroup(child, "SIGTERM");
    }, 5_000);
    const forceTimer = setTimeout(() => {
      killProcessGroup(child, "SIGKILL");
    }, 10_000);
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      clearTimeout(forceTimer);
      resolve({
        exitCode:
          timedOut && signal !== null
            ? "timeout"
            : signal === null
              ? code
              : `signal:${signal}`,
        stderr,
      });
    });
  });

  const stderrPreview = redact(result.stderr);
  return {
    exitCode: result.exitCode,
    started:
      result.exitCode === "timeout" &&
      !/error|failed|exception|not found/i.test(stderrPreview),
    stderrBytes: result.stderr.length,
    stderrPreview,
  };
}

async function runNode(args, context, input) {
  return runCommand(process.execPath, args, context, input);
}

function runCommand(command, args, context, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: context.projectDir,
      env: context.env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      resolve({
        exitCode: code ?? 1,
        stderr,
        stdout,
      });
    });

    child.stdin.end(input);
  });
}

function killProcessGroup(child, signal) {
  if (child.pid === undefined) {
    return;
  }

  try {
    process.kill(-child.pid, signal);
  } catch {
    try {
      child.kill(signal);
    } catch {
      // Process already exited.
    }
  }
}

function summarizeJsonEvents(stdout) {
  const eventTypes = {};
  let jsonLines = 0;
  let errorEvents = 0;
  let textEvents = 0;
  let textChars = 0;

  for (const line of stdout.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      continue;
    }

    jsonLines += 1;
    const parsed = JSON.parse(trimmed);
    const type = typeof parsed.type === "string" ? parsed.type : "unknown";
    eventTypes[type] = (eventTypes[type] ?? 0) + 1;

    if (type === "error") {
      errorEvents += 1;
    }

    if (type === "text") {
      textEvents += 1;
      textChars +=
        typeof parsed.text === "string"
          ? parsed.text.length
          : JSON.stringify(parsed).length;
    }
  }

  return {
    errorEvents,
    eventTypes,
    jsonLines,
    textChars,
    textEvents,
  };
}

function assertInstall(result, label) {
  assert(result.status === "success", `${label} did not succeed`);
  assert(result.model === MODEL_KEY, `${label} selected wrong model`);
  assert(result.modelRef === MODEL_REF, `${label} selected wrong model ref`);
  assert(
    result.mimoCode?.installedVersion === MIMO_VERSION,
    `${label} version`,
  );
  assert(result.verification?.durable === "passed", `${label} durable`);
  assert(result.verification?.currentSession === "passed", `${label} current`);
  assert(result.verification?.modelVisibility === "passed", `${label} models`);
  assert(result.verification?.provenance === "passed", `${label} provenance`);
}

function assertTextRun(summary, label) {
  assert(summary.exitCode === 0, `${label} exited ${summary.exitCode}`);
  assert(summary.errorEvents === 0, `${label} emitted error events`);
  assert(
    summary.textEvents > 0,
    `${label} emitted no text events: ${JSON.stringify(summary)}`,
  );
}

function summarizeInstall(result) {
  return {
    model: result.model,
    modelRef: result.modelRef,
    scope: result.scope,
    status: result.status,
    verification: result.verification,
  };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function redact(value) {
  return value.replace(/gp-[A-Za-z0-9_-]+/gu, "[redacted]").slice(0, 1000);
}
