import type { InstallerResult } from "./contracts.js";
import type { InstallerDeps } from "./deps.js";
import { createNodeDeps } from "./deps.js";
import { runInstallSession, type InstallSessionRequest } from "./session.js";

export interface InstallRequest extends InstallSessionRequest {
  json?: boolean;
}

export async function runInstaller(
  request: InstallRequest,
  deps: InstallerDeps = createNodeDeps(),
): Promise<InstallerResult> {
  return runInstallSession(request, deps);
}
