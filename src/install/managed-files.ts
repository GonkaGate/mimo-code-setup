import { join, relative, resolve } from "node:path";
import type { RuntimePlatform } from "./platform-path.js";
import { isNativeWindowsProfilePath } from "./platform-path.js";

export interface ManagedPaths {
  backupRoot: string;
  baseDir: string;
  secretPath: string;
  statePath: string;
}

export function resolveManagedPaths(homeDir: string): ManagedPaths {
  const baseDir = join(homeDir, ".gonkagate", "mimo-code");

  return {
    backupRoot: join(baseDir, "backups"),
    baseDir,
    secretPath: join(baseDir, "api-key"),
    statePath: join(baseDir, "install-state.json"),
  };
}

export function assertManagedPathOutsideProject(
  managedPath: string,
  projectRoot: string,
): void {
  const relativePath = relative(resolve(projectRoot), resolve(managedPath));
  if (
    relativePath === "" ||
    (!relativePath.startsWith("..") && !relativePath.startsWith("/"))
  ) {
    throw new Error(
      "Managed secret and state files must not be repository-local.",
    );
  }
}

export function assertNativeWindowsProfileManagedPath(
  managedPath: string,
  userProfile: string,
  platform: RuntimePlatform,
): void {
  if (
    platform === "windows" &&
    !isNativeWindowsProfilePath(managedPath, userProfile)
  ) {
    throw new Error(
      "Managed Windows files must stay inside the current user profile.",
    );
  }
}
