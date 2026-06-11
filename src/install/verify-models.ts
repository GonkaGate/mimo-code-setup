import { GONKAGATE_PROVIDER_ID } from "../constants/gateway.js";
import { formatMimoCodeModelRef } from "../constants/models.js";
import type { InstallerBlocker } from "./contracts.js";
import type { InstallerDeps } from "./deps.js";
import { getConfigValue } from "./config-value.js";
import { createVerificationBlocker } from "./verification-blockers.js";

export async function verifyModelVisibility(
  deps: InstallerDeps,
  modelKey: string,
): Promise<readonly InstallerBlocker[]> {
  const result = await deps.commands.run(
    "mimo",
    ["models", GONKAGATE_PROVIDER_ID],
    {
      cwd: deps.cwd(),
      env: deps.env(),
    },
  );

  if (result.exitCode !== 0) {
    return [
      createVerificationBlocker(
        "model_visibility_failed",
        "`mimo models gonkagate` did not complete successfully.",
        result.stderr || result.stdout,
      ),
    ];
  }

  if (
    !result.stdout.includes(modelKey) &&
    !result.stdout.includes(formatMimoCodeModelRef(modelKey))
  ) {
    return [
      createVerificationBlocker(
        "model_visibility_failed",
        "The selected GonkaGate model is not visible to MiMoCode.",
      ),
    ];
  }

  return [];
}

export function detectProviderGatingBlockers(
  config: unknown,
  modelKey: string,
): readonly InstallerBlocker[] {
  const blockers: InstallerBlocker[] = [];
  const enabledProviders = getConfigValue(config, ["enabled_providers"]);
  const disabledProviders = getConfigValue(config, ["disabled_providers"]);
  const whitelist = getConfigValue(config, [
    "provider",
    "gonkagate",
    "whitelist",
  ]);
  const blacklist = getConfigValue(config, [
    "provider",
    "gonkagate",
    "blacklist",
  ]);

  if (
    Array.isArray(enabledProviders) &&
    !enabledProviders.includes(GONKAGATE_PROVIDER_ID)
  ) {
    blockers.push(
      createVerificationBlocker(
        "provider_not_enabled",
        "enabled_providers excludes gonkagate.",
      ),
    );
  }

  if (
    Array.isArray(disabledProviders) &&
    disabledProviders.includes(GONKAGATE_PROVIDER_ID)
  ) {
    blockers.push(
      createVerificationBlocker(
        "provider_disabled",
        "disabled_providers includes gonkagate.",
      ),
    );
  }

  if (Array.isArray(whitelist) && !whitelist.includes(modelKey)) {
    blockers.push(
      createVerificationBlocker(
        "model_not_whitelisted",
        "provider.gonkagate.whitelist excludes the selected model.",
      ),
    );
  }

  if (Array.isArray(blacklist) && blacklist.includes(modelKey)) {
    blockers.push(
      createVerificationBlocker(
        "model_blacklisted",
        "provider.gonkagate.blacklist includes the selected model.",
      ),
    );
  }

  return blockers;
}

export function createInferredProviderBlocker(
  detail: string,
): InstallerBlocker {
  return createVerificationBlocker(
    "model_visibility_failed",
    "Resolved MiMoCode config proves a provider/model blocker, but no locally inspectable layer explains it.",
    detail,
  );
}
