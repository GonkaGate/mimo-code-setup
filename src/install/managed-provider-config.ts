import {
  CURRENT_PROVIDER_PACKAGE,
  GONKAGATE_BASE_URL,
  GONKAGATE_PROVIDER_ID,
  MANAGED_SECRET_FILE_REF,
} from "../constants/gateway.js";
import type {
  ModelDefinition,
  ModelLimits,
  ModelRegistry,
} from "../constants/models.js";

export interface ManagedProviderConfig {
  models: Record<string, ManagedProviderModelConfig>;
  name: "GonkaGate";
  npm: typeof CURRENT_PROVIDER_PACKAGE;
  options: {
    apiKey: typeof MANAGED_SECRET_FILE_REF;
    baseURL: typeof GONKAGATE_BASE_URL;
    setCacheKey: false;
  };
}

export interface ManagedProviderModelConfig {
  limit?: {
    context: number;
    output: number;
  };
  name: string;
  headers?: Readonly<Record<string, string>>;
  options?: Readonly<Record<string, unknown>>;
}

export function createManagedProviderConfig(
  registry: ModelRegistry,
): ManagedProviderConfig {
  const models: Record<string, ManagedProviderModelConfig> = {};

  for (const [key, model] of Object.entries(registry) as [
    string,
    ModelDefinition,
  ][]) {
    if (model.validationStatus !== "validated") {
      continue;
    }

    assertNoCanonicalOverride(model);
    const limit = toManagedLimit(model.limits);
    models[key] = {
      ...(limit === undefined ? {} : { limit }),
      name: model.displayName,
      ...(model.runtimeCompatibility?.modelHeaders === undefined
        ? {}
        : { headers: model.runtimeCompatibility.modelHeaders }),
      ...(model.runtimeCompatibility?.modelOptions === undefined
        ? {}
        : { options: model.runtimeCompatibility.modelOptions }),
    };
  }

  return {
    models,
    name: "GonkaGate",
    npm: CURRENT_PROVIDER_PACKAGE,
    options: {
      apiKey: MANAGED_SECRET_FILE_REF,
      baseURL: GONKAGATE_BASE_URL,
      setCacheKey: false,
    },
  };
}

/**
 * Build the MiMoCode `limit` block from what the gateway actually published.
 *
 * A gateway that has not shipped per-model metadata publishes no context
 * window, so no `limit` block is written at all and MiMoCode keeps its own
 * default. Writing `context: 0` would claim a real, wrong limit.
 *
 * When any limit is known, both keys are written because that is the shape
 * proven against MiMoCode in `src/constants/model-validation.ts`.
 */
function toManagedLimit(
  limits: ModelLimits | undefined,
): { context: number; output: number } | undefined {
  if (limits?.context === undefined && limits?.output === undefined) {
    return undefined;
  }

  return {
    context: limits.context ?? 0,
    output: limits.output ?? 0,
  };
}

function assertNoCanonicalOverride(model: ModelDefinition): void {
  const providerOptions = model.runtimeCompatibility?.providerOptions;
  if (providerOptions === undefined) {
    return;
  }

  if ("apiKey" in providerOptions || "baseURL" in providerOptions) {
    throw new Error(
      `Model ${model.displayName} cannot override managed apiKey or baseURL.`,
    );
  }
}

export function createManagedProviderConfigPatch(registry: ModelRegistry) {
  return {
    path: ["provider", GONKAGATE_PROVIDER_ID],
    value: createManagedProviderConfig(registry),
  } as const;
}
