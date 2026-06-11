import type { InstallerBlocker } from "./contracts.js";
import type { InstallerDeps } from "./deps.js";
import { parseJsoncDocument } from "./jsonc.js";
import { redactText } from "./redact.js";
import {
  verifyEffectiveConfigObject,
  type ExpectedEffectiveConfig,
} from "./effective-config-policy.js";
import { createVerificationBlocker } from "./verification-blockers.js";

export interface EffectiveConfigVerification {
  blockers: readonly InstallerBlocker[];
  commandMayNormalizeConfig: true;
}

export async function verifyDurableEffectiveConfig(
  deps: InstallerDeps,
  expected: ExpectedEffectiveConfig,
): Promise<EffectiveConfigVerification> {
  const env = { ...deps.env() };
  delete env.MIMOCODE_CONFIG_CONTENT;
  delete env.MIMOCODE_AUTH_CONTENT;

  return verifyEffectiveConfigFromCommand(deps, expected, env);
}

export async function verifyCurrentSessionEffectiveConfig(
  deps: InstallerDeps,
  expected: ExpectedEffectiveConfig,
): Promise<EffectiveConfigVerification> {
  return verifyEffectiveConfigFromCommand(deps, expected, deps.env());
}

async function verifyEffectiveConfigFromCommand(
  deps: InstallerDeps,
  expected: ExpectedEffectiveConfig,
  env: NodeJS.ProcessEnv,
): Promise<EffectiveConfigVerification> {
  const result = await deps.commands.run(
    "mimo",
    ["--pure", "debug", "config"],
    {
      cwd: deps.cwd(),
      env,
    },
  );

  if (result.exitCode !== 0) {
    return {
      blockers: [
        createVerificationBlocker(
          "effective_config_mismatch",
          "MiMoCode effective config verification command failed.",
          redactText(result.stderr || result.stdout),
        ),
      ],
      commandMayNormalizeConfig: true,
    };
  }

  try {
    const parsed = parseJsoncDocument(
      result.stdout,
      "mimo --pure debug config",
    );
    return {
      blockers: verifyEffectiveConfigObject(parsed.data, expected),
      commandMayNormalizeConfig: true,
    };
  } catch (error) {
    return {
      blockers: [
        createVerificationBlocker(
          "effective_config_parse_failed",
          "Could not parse MiMoCode effective config output.",
          error instanceof Error ? error.message : String(error),
        ),
      ],
      commandMayNormalizeConfig: true,
    };
  }
}
