import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { InstallerError } from "./errors.js";
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

export function resolveManagedHomeDir(env: NodeJS.ProcessEnv): string {
  const homeDir = [env.HOME, env.USERPROFILE].find(
    (value): value is string => value !== undefined && value.trim().length > 0,
  );

  if (homeDir === undefined) {
    throw new InstallerError({
      category: "storage",
      code: "secret_storage_failed",
      message:
        "Cannot resolve GonkaGate managed storage without HOME or USERPROFILE.",
    });
  }

  return homeDir;
}

export function assertManagedPathOutsideProject(
  managedPath: string,
  projectRoot: string,
): void {
  const resolvedProjectRoot = resolve(projectRoot);
  const resolvedManagedPath = resolve(managedPath);
  const relativePath = relative(resolvedProjectRoot, resolvedManagedPath);

  if (
    relativePath === "" ||
    (relativePath !== ".." &&
      !relativePath.startsWith(`..${sep}`) &&
      !isAbsolute(relativePath))
  ) {
    throw new InstallerError({
      category: "storage",
      code: "secret_storage_failed",
      detail: `Resolved managed path ${resolvedManagedPath} is inside project root ${resolvedProjectRoot}.`,
      message: "Managed secret and state files must not be repository-local.",
    });
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
    throw new InstallerError({
      category: "storage",
      code: "secret_storage_failed",
      detail: `Resolved managed path ${managedPath} is outside user profile ${userProfile}.`,
      message:
        "Managed Windows files must stay inside the current user profile.",
    });
  }
}
