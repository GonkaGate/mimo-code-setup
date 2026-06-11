import type { InstallerDeps } from "./deps.js";

export type RollbackAction =
  | {
      createdPath: string;
      kind: "delete_created";
    }
  | {
      backupPath: string;
      kind: "restore_backup";
      targetPath: string;
    };

export async function runRollback(
  deps: InstallerDeps,
  actions: readonly RollbackAction[],
): Promise<void> {
  for (const action of [...actions].reverse()) {
    if (action.kind === "delete_created") {
      await deps.fs.rm(action.createdPath, { force: true, recursive: true });
      continue;
    }

    await deps.fs.copyFile(action.backupPath, action.targetPath);
  }
}
