import { GONKAGATE_PROVIDER_ID } from "../constants/gateway.js";
import {
  formatMimoCodeModelRef,
  type CuratedModelRegistry,
} from "../constants/models.js";
import type { InstallScope } from "./contracts.js";
import { applyManagedConfigValues } from "./config.js";
import { createManagedProviderConfig } from "./managed-provider-config.js";

export interface ScopeWritePlan {
  globalValues: readonly ManagedConfigValue[];
  projectValues: readonly ManagedConfigValue[];
  scope: InstallScope;
}

export interface ManagedConfigValue {
  path: readonly (string | number)[];
  value: unknown;
}

export function createScopeWritePlan(input: {
  modelKey: string;
  registry?: CuratedModelRegistry;
  scope: InstallScope;
}): ScopeWritePlan {
  const modelRef = formatMimoCodeModelRef(input.modelKey);
  const providerValue: ManagedConfigValue = {
    path: ["provider", GONKAGATE_PROVIDER_ID],
    value: createManagedProviderConfig(input.registry),
  };
  const activationValues: ManagedConfigValue[] = [
    { path: ["model"], value: modelRef },
    { path: ["small_model"], value: modelRef },
  ];

  if (input.scope === "user") {
    return {
      globalValues: [providerValue, ...activationValues],
      projectValues: [],
      scope: input.scope,
    };
  }

  return {
    globalValues: [providerValue],
    projectValues: activationValues,
    scope: input.scope,
  };
}

export function applyScopeValues(
  contents: string,
  values: readonly ManagedConfigValue[],
): string {
  return applyManagedConfigValues(contents, values);
}
