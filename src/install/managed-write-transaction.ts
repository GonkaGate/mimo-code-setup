import type { InstallerDeps } from "./deps.js";
import { runRollback, type RollbackAction } from "./rollback.js";
import {
  writeManagedFile,
  type ManagedWriteOptions,
  type ManagedWriteResult,
} from "./write.js";

export class ManagedWriteTransaction {
  private readonly actions: RollbackAction[] = [];

  constructor(private readonly deps: InstallerDeps) {}

  async write(options: ManagedWriteOptions): Promise<ManagedWriteResult> {
    const result = await writeManagedFile(this.deps, options);
    if (result.rollbackAction !== undefined) {
      this.actions.push(result.rollbackAction);
    }

    return result;
  }

  async rollback(): Promise<void> {
    await runRollback(this.deps, this.actions);
  }
}
