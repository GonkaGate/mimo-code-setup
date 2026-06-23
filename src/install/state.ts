import { CONTRACT_METADATA } from "../constants/contract.js";
import {
  CURRENT_PROVIDER_PACKAGE,
  CURRENT_TRANSPORT,
} from "../constants/gateway.js";
import type { InstallerDeps } from "./deps.js";
import type { InstallState } from "./contracts/install-state.js";

export function createInstallState(
  input: Omit<
    InstallState,
    | "installerVersion"
    | "mimoCodeMinimumVersion"
    | "providerPackage"
    | "transport"
  >,
): InstallState {
  return {
    ...input,
    installerVersion: CONTRACT_METADATA.cliVersion,
    mimoCodeMinimumVersion: CONTRACT_METADATA.mimoCode.minVersion,
    providerPackage: CURRENT_PROVIDER_PACKAGE,
    transport: CURRENT_TRANSPORT,
  };
}

export function parseInstallState(contents: string): InstallState {
  const parsed = JSON.parse(contents) as Partial<InstallState> & {
    auditedMimoCodeBaseline?: string;
  };
  parsed.mimoCodeMinimumVersion ??= parsed.auditedMimoCodeBaseline;
  delete parsed.auditedMimoCodeBaseline;

  const requiredStrings: readonly (keyof InstallState)[] = [
    "globalConfigTarget",
    "installerVersion",
    "lastDurableSetupAt",
    "mimoCodeMinimumVersion",
    "mimoCodeVersion",
    "providerPackage",
    "scope",
    "selectedModelKey",
    "transport",
  ];

  for (const key of requiredStrings) {
    if (typeof parsed[key] !== "string") {
      throw new Error(`Invalid install state: missing ${key}.`);
    }
  }

  if (parsed.scope !== "user" && parsed.scope !== "project") {
    throw new Error("Invalid install state: scope must be user or project.");
  }

  return parsed as InstallState;
}

export async function readInstallState(
  deps: InstallerDeps,
  path: string,
): Promise<InstallState | undefined> {
  if (!(await deps.fs.pathExists(path))) {
    return undefined;
  }

  return parseInstallState(await deps.fs.readText(path));
}

export async function writeInstallState(
  deps: InstallerDeps,
  path: string,
  state: InstallState,
): Promise<void> {
  await deps.fs.writeText(path, `${JSON.stringify(state, null, 2)}\n`, {
    mode: 0o600,
  });
}
