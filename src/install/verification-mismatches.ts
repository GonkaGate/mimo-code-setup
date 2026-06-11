import type { InstallerBlocker } from "./contracts.js";
import { createVerificationBlocker } from "./verification-blockers.js";

export function createEffectiveConfigMismatch(
  message: string,
  detail?: string,
): InstallerBlocker {
  return createVerificationBlocker(
    "effective_config_mismatch",
    message,
    detail,
  );
}
