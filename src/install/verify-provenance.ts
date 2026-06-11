import { MANAGED_SECRET_FILE_REF } from "../constants/gateway.js";
import type { InstallerBlocker } from "./contracts.js";
import type { InstallerDeps } from "./deps.js";
import { getConfigValue } from "./config-value.js";
import { parseJsoncDocument } from "./jsonc.js";
import { verifyManagedSecret } from "./storage.js";
import { checkProjectConfigCommitSafety } from "./verify-layers.js";
import { createVerificationBlocker } from "./verification-blockers.js";
import type { RuntimePlatform } from "./platform-path.js";

export interface VerifySecretProvenanceInput {
  globalConfigContents: string;
  key: string;
  platform?: RuntimePlatform;
  projectConfigContents?: string;
  secretPath: string;
}

export async function verifySecretProvenance(
  deps: InstallerDeps,
  input: VerifySecretProvenanceInput,
): Promise<readonly InstallerBlocker[]> {
  const blockers: InstallerBlocker[] = [];

  if (!(await verifyManagedSecret(deps, input.key, input.secretPath))) {
    blockers.push(
      createVerificationBlocker(
        "secret_provenance_failed",
        "Managed GonkaGate secret file is missing or does not match the intended key.",
      ),
    );
  }

  if (
    input.platform !== "windows" &&
    (await deps.fs.pathExists(input.secretPath))
  ) {
    const mode = (await deps.fs.stat(input.secretPath)).mode & 0o777;
    if ((mode & 0o077) !== 0) {
      blockers.push(
        createVerificationBlocker(
          "secret_provenance_failed",
          "Managed GonkaGate secret file permissions are not owner-only.",
        ),
      );
    }
  }

  const globalConfig = parseJsoncDocument(input.globalConfigContents);
  const globalApiKey = getConfigValue(globalConfig.data, [
    "provider",
    "gonkagate",
    "options",
    "apiKey",
  ]);
  if (globalApiKey !== MANAGED_SECRET_FILE_REF) {
    blockers.push(
      createVerificationBlocker(
        "secret_provenance_failed",
        "Global MiMoCode config does not contain the canonical GonkaGate file binding.",
      ),
    );
  }

  if (input.projectConfigContents !== undefined) {
    blockers.push(
      ...checkProjectConfigCommitSafety(input.projectConfigContents),
    );
  }

  return blockers;
}
