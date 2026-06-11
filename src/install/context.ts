import type { InstallerDeps } from "./deps.js";

export interface InstallerContext {
  cwd: string;
  env: NodeJS.ProcessEnv;
  platform: NodeJS.Platform;
}

export function resolveInstallerContext(deps: InstallerDeps): InstallerContext {
  return {
    cwd: deps.cwd(),
    env: deps.env(),
    platform: deps.platform,
  };
}
