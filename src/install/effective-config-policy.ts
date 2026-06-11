import {
  CURRENT_PROVIDER_PACKAGE,
  CURRENT_TRANSPORT,
  GONKAGATE_BASE_URL,
} from "../constants/gateway.js";
import { formatMimoCodeModelRef } from "../constants/models.js";
import type { InstallerBlocker } from "./contracts.js";
import { getConfigValue, isRecord } from "./config-value.js";
import { createEffectiveConfigMismatch } from "./verification-mismatches.js";

export interface ExpectedEffectiveConfig {
  modelKey: string;
  validatedModelKeys: readonly string[];
}

export function verifyEffectiveConfigObject(
  config: unknown,
  expected: ExpectedEffectiveConfig,
): readonly InstallerBlocker[] {
  const blockers: InstallerBlocker[] = [];
  const modelRef = formatMimoCodeModelRef(expected.modelKey);

  if (getConfigValue(config, ["model"]) !== modelRef) {
    blockers.push(
      createEffectiveConfigMismatch(
        "Resolved `model` is not the selected GonkaGate model.",
      ),
    );
  }

  if (getConfigValue(config, ["small_model"]) !== modelRef) {
    blockers.push(
      createEffectiveConfigMismatch(
        "Resolved `small_model` is not the selected GonkaGate model.",
      ),
    );
  }

  const provider = getConfigValue(config, ["provider", "gonkagate"]);
  if (!isRecord(provider)) {
    blockers.push(
      createEffectiveConfigMismatch(
        "Resolved config does not include provider.gonkagate.",
      ),
    );
    return blockers;
  }

  if (getConfigValue(provider, ["npm"]) !== CURRENT_PROVIDER_PACKAGE) {
    blockers.push(
      createEffectiveConfigMismatch(
        "Resolved provider package is not the current GonkaGate package.",
      ),
    );
  }

  if (getConfigValue(provider, ["options", "baseURL"]) !== GONKAGATE_BASE_URL) {
    blockers.push(
      createEffectiveConfigMismatch(
        "Resolved GonkaGate base URL is not canonical.",
      ),
    );
  }

  if (CURRENT_TRANSPORT !== "chat_completions") {
    blockers.push(
      createEffectiveConfigMismatch(
        "Resolved transport is not chat_completions.",
      ),
    );
  }

  for (const key of expected.validatedModelKeys) {
    if (!isRecord(getConfigValue(provider, ["models", key]))) {
      blockers.push(
        createEffectiveConfigMismatch(
          `Resolved provider catalog is missing validated model ${key}.`,
        ),
      );
    }
  }

  return blockers;
}
