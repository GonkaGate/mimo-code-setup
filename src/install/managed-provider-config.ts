import {
  CURRENT_PROVIDER_PACKAGE,
  GONKAGATE_BASE_URL,
  GONKAGATE_PROVIDER_ID,
  MANAGED_SECRET_FILE_REF,
} from "../constants/gateway.js";
import {
  CURATED_MODEL_REGISTRY,
  type CuratedModelDefinition,
  type CuratedModelRegistry,
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
  limit: {
    context: number;
    output: number;
  };
  name: string;
  headers?: Readonly<Record<string, string>>;
  options?: Readonly<Record<string, unknown>>;
}

export function createManagedProviderConfig(
  registry: CuratedModelRegistry = CURATED_MODEL_REGISTRY,
): ManagedProviderConfig {
  const models: Record<string, ManagedProviderModelConfig> = {};

  for (const [key, model] of Object.entries(registry) as [
    string,
    CuratedModelDefinition,
  ][]) {
    if (model.validationStatus !== "validated") {
      continue;
    }

    assertNoCanonicalOverride(model);
    models[key] = {
      limit: {
        context: model.limits?.context ?? 0,
        output: model.limits?.output ?? 0,
      },
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

function assertNoCanonicalOverride(model: CuratedModelDefinition): void {
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

export function createManagedProviderConfigPatch(
  registry?: CuratedModelRegistry,
) {
  return {
    path: ["provider", GONKAGATE_PROVIDER_ID],
    value: createManagedProviderConfig(registry),
  } as const;
}
