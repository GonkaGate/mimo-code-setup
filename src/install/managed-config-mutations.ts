import {
  CURATED_MODEL_REGISTRY,
  formatMimoCodeModelRef,
  type CuratedModelRegistry,
} from "../constants/models.js";
import type { InstallState } from "./contracts/install-state.js";
import { getConfigValue } from "./config-value.js";
import { deleteJsoncValue, parseJsoncDocument } from "./jsonc.js";

export interface CleanupActivationOptions {
  currentModelKey: string;
  installState?: InstallState;
  registry?: CuratedModelRegistry;
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

  const registry = options.registry ?? CURATED_MODEL_REGISTRY;
  return Object.keys(registry).some(
    (key) => value === formatMimoCodeModelRef(key),
  );
}
