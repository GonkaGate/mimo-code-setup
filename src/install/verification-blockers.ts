import type { InstallerBlocker } from "./contracts.js";
import { redactText } from "./redact.js";

export function createVerificationBlocker(
  code: InstallerBlocker["code"],
  message: string,
  detail?: string,
): InstallerBlocker {
  return {
    code,
    detail: detail === undefined ? undefined : redactText(detail),
    message: redactText(message),
    source: "verification",
  };
}
