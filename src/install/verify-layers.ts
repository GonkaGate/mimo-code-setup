import { resolveProjectConfigLayers } from "./paths.js";
import {
  MANAGED_SECRET_FILE_REF,
  MANAGED_SECRET_PATH,
} from "../constants/gateway.js";
import { getConfigValue } from "./config-value.js";
import { parseJsoncDocument } from "./jsonc.js";
import { createVerificationBlocker } from "./verification-blockers.js";
import type { InstallerBlocker } from "./contracts.js";

export interface InspectableConfigLayers {
  globalCandidates: readonly string[];
  projectLayers: readonly string[];
  runtimeConfigPath?: string;
  runtimeConfigContentPresent: boolean;
}

export function checkProjectConfigCommitSafety(
  contents: string,
): readonly InstallerBlocker[] {
  const blockers: InstallerBlocker[] = [];
  const parsed = parseJsoncDocument(contents, "project config");
  const apiKey = getConfigValue(parsed.data, [
    "provider",
    "gonkagate",
    "options",
    "apiKey",
  ]);

  if (apiKey !== undefined) {
    blockers.push(
      createVerificationBlocker(
        "project_secret_binding_forbidden",
        "Project config must not define provider.gonkagate.options.apiKey.",
      ),
    );
  }

  if (
    contents.includes(MANAGED_SECRET_FILE_REF) ||
    contents.includes(MANAGED_SECRET_PATH)
  ) {
    blockers.push(
      createVerificationBlocker(
        "project_secret_binding_forbidden",
        "Project config must not contain the managed GonkaGate secret path.",
      ),
    );
  }

  if (/gp-[A-Za-z0-9_-]+/u.test(contents)) {
    blockers.push(
      createVerificationBlocker(
        "project_secret_binding_forbidden",
        "Project config must not contain a raw GonkaGate API key.",
        contents,
      ),
    );
  }

  if (getConfigValue(parsed.data, ["auth"]) !== undefined) {
    blockers.push(
      createVerificationBlocker(
        "project_secret_binding_forbidden",
        "Project config must not contain MiMoCode auth storage data.",
      ),
    );
  }

  return blockers;
}

export function detectCurrentSessionOverrideBlockers(input: {
  env: NodeJS.ProcessEnv;
  projectScope: boolean;
  resolvedMatchesDurable: boolean;
}): readonly InstallerBlocker[] {
  const blockers: InstallerBlocker[] = [];
  const overrideNames = [
    "MIMOCODE_CONFIG",
    "MIMOCODE_CONFIG_CONTENT",
    "MIMOCODE_CONFIG_DIR",
    "MIMOCODE_AUTH_CONTENT",
  ].filter((name) => input.env[name] !== undefined);

  if (
    input.projectScope &&
    input.env.MIMOCODE_DISABLE_PROJECT_CONFIG !== undefined
  ) {
    blockers.push(
      createVerificationBlocker(
        "runtime_override_conflict",
        "MIMOCODE_DISABLE_PROJECT_CONFIG disables project-scope activation.",
      ),
    );
  }

  if (!input.resolvedMatchesDurable && overrideNames.length > 0) {
    blockers.push(
      createVerificationBlocker(
        "runtime_override_conflict",
        `Current-session MiMoCode overrides changed the effective result: ${overrideNames.join(", ")}.`,
      ),
    );
  }

  if (!input.resolvedMatchesDurable && overrideNames.length === 0) {
    blockers.push(
      createVerificationBlocker(
        "runtime_override_conflict",
        "Resolved config changed without a locally inspectable override; a remote, managed, or higher-precedence source may be active.",
      ),
    );
  }

  return blockers;
}

export function listInspectableConfigLayers(input: {
  env: NodeJS.ProcessEnv;
  globalCandidates: readonly string[];
  projectRoot: string;
}): InspectableConfigLayers {
  const project = resolveProjectConfigLayers(input.projectRoot, input.env);

  return {
    globalCandidates: input.globalCandidates,
    projectLayers: [...project.rootLayers, ...project.configDirLayers],
    runtimeConfigContentPresent:
      input.env.MIMOCODE_CONFIG_CONTENT !== undefined,
    runtimeConfigPath: input.env.MIMOCODE_CONFIG,
  };
}
