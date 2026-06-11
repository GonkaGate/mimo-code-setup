import { CONTRACT_METADATA } from "../constants/contract.js";
import {
  CURRENT_PROVIDER_PACKAGE,
  GONKAGATE_BASE_URL,
  GONKAGATE_PROVIDER_ID,
  MANAGED_SECRET_FILE_REF,
  TARGET_CLI,
} from "../constants/gateway.js";
import type { InstallerResult } from "../install/contracts.js";
import { redactText } from "../install/redact.js";
import { redactJsonValue } from "../install/redact.js";
import type { CliEntrypointError } from "./contracts.js";

const MODELS_ENDPOINT = `${GONKAGATE_BASE_URL}/models`;

export function renderStatusJson(): string {
  return `${JSON.stringify(
    {
      packageName: CONTRACT_METADATA.packageName,
      publicEntrypoint: CONTRACT_METADATA.publicEntrypoint,
      status: "blocked",
      targetCli: TARGET_CLI,
      provider: {
        id: GONKAGATE_PROVIDER_ID,
        baseURL: GONKAGATE_BASE_URL,
        npm: CURRENT_PROVIDER_PACKAGE,
      },
      modelsEndpoint: MODELS_ENDPOINT,
      message: CONTRACT_METADATA.publicState,
    },
    null,
    2,
  )}\n`;
}

export function renderStatusText(): string {
  return [
    "GonkaGate MiMoCode setup is available.",
    "",
    CONTRACT_METADATA.publicState,
    "",
    `Package: ${CONTRACT_METADATA.packageName}`,
    `Future entrypoint: ${CONTRACT_METADATA.publicEntrypoint}`,
    `Target CLI: ${TARGET_CLI}`,
    `Provider: ${GONKAGATE_PROVIDER_ID}`,
    `Base URL: ${GONKAGATE_BASE_URL}`,
    `Models endpoint: ${MODELS_ENDPOINT}`,
    "",
    "Runtime model catalog is fetched from GonkaGate after API-key intake.",
    "",
  ].join("\n");
}

export function renderCliEntrypointError(error: unknown): CliEntrypointError {
  const message = error instanceof Error ? error.message : String(error);

  return {
    exitCode: 1,
    stderrText: `${redactText(message).trim()}\n`,
  };
}

export function renderInstallerJson(result: InstallerResult): string {
  return `${JSON.stringify(redactJsonValue(result), null, 2)}\n`;
}

export function renderInstallerText(result: InstallerResult): string {
  if (result.status === "success") {
    return [
      "GonkaGate MiMoCode setup complete.",
      `Model: ${result.modelRef}`,
      `Scope: ${result.scope}`,
      `Global config: ${result.configTargets.globalConfigPath}`,
      result.configTargets.projectConfigPath === undefined
        ? undefined
        : `Project config: ${result.configTargets.projectConfigPath}`,
      "",
      "Next: mimo",
      "",
    ]
      .filter((line): line is string => line !== undefined)
      .join("\n");
  }

  const blockers = result.blockers.map(
    (blocker) => `- ${blocker.code}: ${blocker.message}`,
  );

  return [
    result.status === "blocked"
      ? "GonkaGate MiMoCode setup is blocked."
      : "GonkaGate MiMoCode setup failed.",
    result.message,
    "",
    ...blockers,
    "",
  ].join("\n");
}
