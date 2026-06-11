import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";

export interface FakeMimoCommand {
  args: readonly string[];
  exitCode?: number;
  stderr?: string;
  stdout?: string;
}

export interface FakeMimoHarness {
  binDir: string;
  cleanup(): void;
  commandsPath: string;
  env: NodeJS.ProcessEnv;
  homeDir: string;
  projectDir: string;
  root: string;
}

export function createFakeMimoHarness(
  commands: readonly FakeMimoCommand[],
): FakeMimoHarness {
  const root = mkdtempSync(join(tmpdir(), "mimo-code-setup-"));
  const binDir = join(root, "bin");
  const homeDir = join(root, "home");
  const projectDir = join(root, "project");
  const commandsPath = join(root, "commands.json");
  const scriptPath = join(root, "fake-mimo.mjs");

  mkdirp(homeDir);
  mkdirp(projectDir);
  writeFileSync(commandsPath, JSON.stringify(commands, null, 2));

  const script = `#!/usr/bin/env node
import { readFileSync } from "node:fs";
const commands = JSON.parse(readFileSync(process.env.FAKE_MIMO_COMMANDS, "utf8"));
const args = process.argv.slice(2);
const index = commands.findIndex((command) => JSON.stringify(command.args) === JSON.stringify(args));
if (index === -1) {
  process.stderr.write("unexpected fake mimo command: " + JSON.stringify(args) + "\\n");
  process.exit(127);
}
const command = commands[index];
if (command.stdout) process.stdout.write(command.stdout);
if (command.stderr) process.stderr.write(command.stderr);
process.exit(command.exitCode ?? 0);
`;

  mkdirp(binDir);
  writeFileSync(scriptPath, script, { mode: 0o755 });
  if (process.platform === "win32") {
    writeFileSync(
      join(binDir, "mimo.cmd"),
      `@echo off\r\n"${process.execPath}" "${scriptPath}" %*\r\n`,
    );
  } else {
    writeFileSync(join(binDir, "mimo"), script, { mode: 0o755 });
  }

  return {
    binDir,
    cleanup() {
      rmSync(root, { force: true, recursive: true });
    },
    commandsPath,
    env: {
      FAKE_MIMO_COMMANDS: commandsPath,
      HOME: homeDir,
      PATH: `${binDir}${delimiter}${process.env.PATH ?? ""}`,
      USERPROFILE: homeDir,
    },
    homeDir,
    projectDir,
    root,
  };
}

function mkdirp(path: string): void {
  mkdirSync(path, { recursive: true });
  writeFileSync(join(path, ".keep"), "", { mode: 0o644 });
}
