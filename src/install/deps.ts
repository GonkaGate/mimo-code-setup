import { spawn } from "node:child_process";
import {
  chmod,
  copyFile,
  mkdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { dirname } from "node:path";
import process from "node:process";
import { password, select } from "@inquirer/prompts";

export interface CommandExecutionOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  input?: string;
}

export interface CommandExecutionResult {
  exitCode: number;
  stderr: string;
  stdout: string;
}

export interface CommandExecutor {
  run(
    command: string,
    args: readonly string[],
    options?: CommandExecutionOptions,
  ): Promise<CommandExecutionResult>;
}

export interface FileStat {
  isDirectory(): boolean;
  isFile(): boolean;
  mode: number;
}

export interface FileSystem {
  chmod(path: string, mode: number): Promise<void>;
  copyFile(source: string, target: string): Promise<void>;
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  pathExists(path: string): Promise<boolean>;
  readText(path: string): Promise<string>;
  rename(source: string, target: string): Promise<void>;
  rm(
    path: string,
    options?: { force?: boolean; recursive?: boolean },
  ): Promise<void>;
  stat(path: string): Promise<FileStat>;
  writeText(
    path: string,
    contents: string,
    options?: { mode?: number },
  ): Promise<void>;
}

export interface PromptAdapter {
  password(message: string): Promise<string>;
  select<TValue extends string>(
    message: string,
    choices: readonly { name: string; value: TValue }[],
  ): Promise<TValue>;
}

export interface RuntimeStreams {
  stderr: Pick<NodeJS.WriteStream, "isTTY" | "write">;
  stdin: Pick<NodeJS.ReadStream, "isTTY" | "readable">;
  stdout: Pick<NodeJS.WriteStream, "isTTY" | "write">;
}

export interface InstallerDeps {
  clock: { now(): Date };
  commands: CommandExecutor;
  cwd(): string;
  env(): NodeJS.ProcessEnv;
  fs: FileSystem;
  platform: NodeJS.Platform;
  prompts: PromptAdapter;
  readStdin(): Promise<string>;
  streams: RuntimeStreams;
}

export function createNodeDeps(): InstallerDeps {
  return {
    clock: {
      now: () => new Date(),
    },
    commands: createNodeCommandExecutor(),
    cwd: () => process.cwd(),
    env: () => ({ ...process.env }),
    fs: createNodeFileSystem(),
    platform: process.platform,
    prompts: {
      password: (message) => password({ message }),
      select: (message, choices) => select({ choices: [...choices], message }),
    },
    readStdin: () => readStreamText(process.stdin),
    streams: {
      stderr: process.stderr,
      stdin: process.stdin,
      stdout: process.stdout,
    },
  };
}

async function readStreamText(
  stream: AsyncIterable<Buffer | string>,
): Promise<string> {
  let contents = "";

  for await (const chunk of stream) {
    contents += String(chunk);
  }

  return contents;
}

export function createNodeFileSystem(): FileSystem {
  return {
    chmod,
    copyFile,
    async mkdir(path, options) {
      await mkdir(path, options);
    },
    async pathExists(path) {
      try {
        await stat(path);
        return true;
      } catch (error) {
        if (isNodeError(error) && error.code === "ENOENT") {
          return false;
        }
        throw error;
      }
    },
    readText: (path) => readFile(path, "utf8"),
    rename,
    rm,
    stat,
    async writeText(path, contents, options) {
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, contents, {
        encoding: "utf8",
        mode: options?.mode,
      });
    },
  };
}

export function createNodeCommandExecutor(): CommandExecutor {
  return {
    run(command, args, options) {
      return new Promise((resolve, reject) => {
        const child = spawn(command, [...args], {
          cwd: options?.cwd,
          env: options?.env,
          shell: false,
          stdio: ["pipe", "pipe", "pipe"],
          windowsHide: true,
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
        child.on("close", (exitCode) => {
          resolve({
            exitCode: exitCode ?? 1,
            stderr,
            stdout,
          });
        });

        if (options?.input !== undefined) {
          child.stdin.end(options.input);
        } else {
          child.stdin.end();
        }
      });
    },
  };
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
