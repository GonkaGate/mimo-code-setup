import { createHash } from "node:crypto";
import { basename, join } from "node:path";
import type { InstallerDeps } from "./deps.js";
import type { RollbackAction } from "./rollback.js";

export interface ManagedWriteOptions {
  backupRoot: string;
  contents: string;
  mode?: number;
  projectScoped?: boolean;
  timestamp: Date;
  targetPath: string;
}

export interface ManagedWriteResult {
  backupPath?: string;
  changed: boolean;
  rollbackAction?: RollbackAction;
  targetPath: string;
}

export async function writeManagedFile(
  deps: InstallerDeps,
  options: ManagedWriteOptions,
): Promise<ManagedWriteResult> {
  const exists = await deps.fs.pathExists(options.targetPath);
  const previous = exists
    ? await deps.fs.readText(options.targetPath)
    : undefined;

  if (previous === options.contents) {
    return {
      changed: false,
      targetPath: options.targetPath,
    };
  }

  let backupPath: string | undefined;
  let rollbackAction: RollbackAction;

  if (exists) {
    backupPath = createBackupPath(options);
    await deps.fs.mkdir(dirnameForBackup(backupPath), { recursive: true });
    await deps.fs.copyFile(options.targetPath, backupPath);
    rollbackAction = {
      backupPath,
      kind: "restore_backup",
      targetPath: options.targetPath,
    };
  } else {
    rollbackAction = {
      createdPath: options.targetPath,
      kind: "delete_created",
    };
  }

  const tempPath = `${options.targetPath}.tmp-${options.timestamp.getTime()}`;
  await deps.fs.writeText(tempPath, options.contents, { mode: options.mode });
  await deps.fs.rename(tempPath, options.targetPath);

  return {
    backupPath,
    changed: true,
    rollbackAction,
    targetPath: options.targetPath,
  };
}

function createBackupPath(options: ManagedWriteOptions): string {
  const stamp = options.timestamp.toISOString().replaceAll(/[:.]/g, "-");

  if (options.projectScoped === true) {
    const hash = createHash("sha256")
      .update(options.targetPath)
      .digest("hex")
      .slice(0, 12);
    return join(
      options.backupRoot,
      "project-config",
      `${hash}-${basename(options.targetPath)}.${stamp}.bak`,
    );
  }

  return join(
    options.backupRoot,
    `${basename(options.targetPath)}.${stamp}.bak`,
  );
}

function dirnameForBackup(path: string): string {
  return path.slice(0, Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\")));
}
