import type { InstallerDeps } from "./deps.js";
import {
  assertManagedPathOutsideProject,
  assertNativeWindowsProfileManagedPath,
  resolveManagedPaths,
} from "./managed-files.js";
import type { RuntimePlatform } from "./platform-path.js";

export interface WriteSecretOptions {
  homeDir: string;
  platform: RuntimePlatform;
  projectRoot: string;
  userProfile?: string;
}

export interface WriteSecretResult {
  changed: boolean;
  path: string;
  repairedPermissions: boolean;
}

export async function writeManagedSecret(
  deps: InstallerDeps,
  key: string,
  options: WriteSecretOptions,
): Promise<WriteSecretResult> {
  const paths = resolveManagedPaths(options.homeDir);
  assertManagedPathOutsideProject(paths.secretPath, options.projectRoot);
  assertNativeWindowsProfileManagedPath(
    paths.secretPath,
    options.userProfile ?? options.homeDir,
    options.platform,
  );

  await deps.fs.mkdir(paths.baseDir, { recursive: true });
  let existing: string | undefined;
  if (await deps.fs.pathExists(paths.secretPath)) {
    existing = await deps.fs.readText(paths.secretPath);
  }

  const desiredContents = `${key}\n`;
  const unchanged = existing === desiredContents;
  if (!unchanged) {
    await deps.fs.writeText(paths.secretPath, desiredContents, { mode: 0o600 });
  }

  let repairedPermissions = false;
  if (options.platform !== "windows") {
    await deps.fs.chmod(paths.baseDir, 0o700);
    await deps.fs.chmod(paths.secretPath, 0o600);
    repairedPermissions = unchanged;
  }

  return {
    changed: !unchanged,
    path: paths.secretPath,
    repairedPermissions,
  };
}

export async function verifyManagedSecret(
  deps: InstallerDeps,
  key: string,
  secretPath: string,
): Promise<boolean> {
  if (!(await deps.fs.pathExists(secretPath))) {
    return false;
  }

  return (await deps.fs.readText(secretPath)).trim() === key;
}
