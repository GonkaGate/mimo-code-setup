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
import {
  classifyRuntimePlatform,
  normalizeExecutableCandidates,
  type RuntimePlatform,
} from "./platform-path.js";

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

export interface HttpJsonRequest {
  headers?: Readonly<Record<string, string>>;
}

export interface HttpJsonResponse {
  body: unknown;
  status: number;
}

export interface HttpClient {
  getJson(url: string, request?: HttpJsonRequest): Promise<HttpJsonResponse>;
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

export interface PasswordPromptOptions {
  mask?: boolean | string;
}

export interface PromptAdapter {
  password(message: string, options?: PasswordPromptOptions): Promise<string>;
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
  http: HttpClient;
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
    http: createNodeHttpClient(),
    platform: process.platform,
    prompts: {
      password: (message, options) =>
        password({ mask: options?.mask, message }),
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

export function createNodeHttpClient(): HttpClient {
  return {
    async getJson(url, request) {
      const response = await fetch(url, {
        headers: request?.headers,
      });
      const text = await response.text();

      if (text.trim().length === 0) {
        return {
          body: undefined,
          status: response.status,
        };
      }

      try {
        return {
          body: JSON.parse(text) as unknown,
          status: response.status,
        };
      } catch {
        return {
          body: text,
          status: response.status,
        };
      }
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
  const platform = classifyRuntimePlatform({ platform: process.platform });

  return {
    async run(command, args, options) {
      const candidates = normalizeExecutableCandidates(command, platform);
      let lastError: unknown;

      for (const candidate of candidates) {
        try {
          return await runCommandCandidate(candidate, args, options, platform);
        } catch (error) {
          if (isNodeError(error) && error.code === "ENOENT") {
            lastError = error;
            continue;
          }

          throw error;
        }
      }

      throw lastError ?? new Error(`Command not found: ${command}`);
    },
  };
}

function runCommandCandidate(
  command: string,
  args: readonly string[],
  options: CommandExecutionOptions | undefined,
  platform: RuntimePlatform,
): Promise<CommandExecutionResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, [...args], {
      cwd: options?.cwd,
      env: options?.env,
      shell: platform === "windows" && command.endsWith(".cmd"),
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
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
