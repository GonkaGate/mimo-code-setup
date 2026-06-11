import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  CommandExecutionOptions,
  CommandExecutionResult,
  InstallerDeps,
} from "../../src/install/deps.js";
import { createNodeFileSystem } from "../../src/install/deps.js";

export interface RecordedCommand {
  args: readonly string[];
  command: string;
  options?: CommandExecutionOptions;
}

export interface TestDeps extends InstallerDeps {
  cleanup(): void;
  commandLog: RecordedCommand[];
  queueCommand(result: CommandExecutionResult): void;
  queuePrompt(value: string): void;
  root: string;
  setCwd(path: string): void;
  setEnv(env: NodeJS.ProcessEnv): void;
  setStdin(contents: string): void;
}

export function createTestDeps(): TestDeps {
  const root = mkdtempSync(join(tmpdir(), "mimo-code-setup-deps-"));
  let cwd = root;
  let env: NodeJS.ProcessEnv = {};
  let stdinContents = "";
  const commandResults: CommandExecutionResult[] = [];
  const commandLog: RecordedCommand[] = [];
  const promptValues: string[] = [];

  const deps: TestDeps = {
    cleanup() {
      rmSync(root, { force: true, recursive: true });
    },
    clock: {
      now: () => new Date("2026-06-11T00:00:00.000Z"),
    },
    commandLog,
    commands: {
      async run(command, args, options) {
        commandLog.push({ args, command, options });
        return (
          commandResults.shift() ?? {
            exitCode: 127,
            stderr: "missing queued command",
            stdout: "",
          }
        );
      },
    },
    cwd: () => cwd,
    env: () => ({ ...env }),
    fs: createNodeFileSystem(),
    platform: "linux",
    prompts: {
      async password() {
        return promptValues.shift() ?? "";
      },
      async select(_message, choices) {
        return choices[0]?.value ?? "";
      },
    },
    readStdin: async () => stdinContents,
    queueCommand(result) {
      commandResults.push(result);
    },
    queuePrompt(value) {
      promptValues.push(value);
    },
    root,
    setCwd(path) {
      cwd = path;
    },
    setEnv(nextEnv) {
      env = { ...nextEnv };
    },
    setStdin(contents) {
      stdinContents = contents;
    },
    streams: {
      stderr: { isTTY: true, write: () => true },
      stdin: { isTTY: true, readable: true },
      stdout: { isTTY: true, write: () => true },
    },
  };

  return deps;
}
