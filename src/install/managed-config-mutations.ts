import {
  formatMimoCodeModelRef,
  type ModelRegistry,
} from "../constants/models.js";
import type { InstallState } from "./contracts/install-state.js";
import { getConfigValue } from "./config-value.js";
import { deleteJsoncValue, parseJsoncDocument } from "./jsonc.js";

export interface CleanupActivationOptions {
  currentModelKey: string;
  installState?: InstallState;
  /** Live catalog for this run; absent when no catalog was fetched. */
  registry?: ModelRegistry;
}

export function cleanupInstallerOwnedActivation(
  contents: string,
  options: CleanupActivationOptions,
): string {
  let next = contents;
  const parsed = parseJsoncDocument(contents);

  for (const key of ["model", "small_model"] as const) {
    const value = getConfigValue(parsed.data, [key]);
    if (typeof value === "string" && isInstallerOwnedModelRef(value, options)) {
      next = deleteJsoncValue(next, [key]);
    }
  }

  return next;
}

export function isInstallerOwnedModelRef(
  value: string,
  options: CleanupActivationOptions,
): boolean {
  if (value === formatMimoCodeModelRef(options.currentModelKey)) {
    return true;
  }

  if (value === options.installState?.previousManagedModelRef) {
    return true;
  }

  return Object.keys(options.registry ?? {}).some(
    (key) => value === formatMimoCodeModelRef(key),
  );
}
