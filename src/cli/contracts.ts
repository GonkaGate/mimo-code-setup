import type { CuratedModelRegistry } from "../constants/models.js";
import type { InstallerDeps } from "../install/deps.js";

export interface CliOptions {
  apiKeyStdin?: boolean;
  cwd?: string;
  json?: boolean;
  model?: string;
  scope?: "user" | "project";
  yes?: boolean;
}

export interface CliRunResult {
  exitCode: number;
  status: "success" | "blocked" | "failed";
}

export interface CliRunOptions {
  deps?: InstallerDeps;
  registry?: CuratedModelRegistry;
  stderr?: Pick<NodeJS.WriteStream, "write">;
  stdout?: Pick<NodeJS.WriteStream, "write">;
}

export interface CliEntrypointError {
  exitCode: number;
  stderrText: string;
}
