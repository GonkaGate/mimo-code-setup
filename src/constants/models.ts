export const MODEL_TRANSPORTS = Object.freeze([
  "chat_completions",
  "responses",
] as const);

export type ModelTransport = (typeof MODEL_TRANSPORTS)[number];
export type ModelValidationStatus = "candidate" | "validated";

export interface ModelProviderOverride {
  api?: ModelTransport;
  npm?: string;
}

export interface ModelCompatibility {
  modelHeaders?: Readonly<Record<string, string>>;
  modelOptions?: Readonly<Record<string, unknown>>;
  modelProvider?: Readonly<ModelProviderOverride>;
  notes?: readonly string[];
  providerOptions?: Readonly<Record<string, unknown>>;
}

export interface ModelLimits {
  context?: number;
  output?: number;
}

export interface ModelMigrationMetadata {
  adapterPackage?: string;
  transport?: ModelTransport;
}

/**
 * Runtime shape of one GonkaGate model.
 *
 * Every field except the installer-owned adapter/transport metadata comes from
 * the live `GET /v1/models` response. This repository does not check in a model
 * catalog, model ids, display names, or context windows.
 */
export interface ModelDefinition {
  adapterPackage: string;
  description?: string;
  displayName: string;
  limits?: ModelLimits;
  migrationMetadata?: ModelMigrationMetadata;
  modelId: string;
  runtimeCompatibility?: ModelCompatibility;
  transport: ModelTransport;
  validationStatus: ModelValidationStatus;
}

export interface ModelRegistry {
  readonly [key: string]: ModelDefinition;
}

export type ModelRecord<TKey extends string = string> = ModelDefinition & {
  key: TKey;
};

type ModelKeyOf<TRegistry extends ModelRegistry> = Extract<
  keyof TRegistry,
  string
>;

type ModelRecordFor<
  TRegistry extends ModelRegistry,
  TKey extends ModelKeyOf<TRegistry> = ModelKeyOf<TRegistry>,
> = TRegistry[TKey] & {
  key: TKey;
};

type ValidatedModelRecordFor<
  TRegistry extends ModelRegistry,
  TKey extends ModelKeyOf<TRegistry> = ModelKeyOf<TRegistry>,
> = Extract<ModelRecordFor<TRegistry, TKey>, { validationStatus: "validated" }>;

export interface ModelIndex<TRegistry extends ModelRegistry = ModelRegistry> {
  modelKeys: readonly ModelKeyOf<TRegistry>[];
  models: readonly ModelRecordFor<TRegistry>[];
  validatedModelKeys: readonly ValidatedModelRecordFor<TRegistry>["key"][];
  validatedModels: readonly ValidatedModelRecordFor<TRegistry>[];
}

export type MimoCodeModelRef<TKey extends string = string> =
  `gonkagate/${TKey}`;

function toModelRecord<
  TKey extends string,
  TDefinition extends ModelDefinition,
>(key: TKey, definition: TDefinition): TDefinition & { key: TKey } {
  return {
    ...definition,
    key,
  };
}

export function isValidatedModel<
  TModel extends { validationStatus: ModelValidationStatus },
>(model: TModel): model is Extract<TModel, { validationStatus: "validated" }> {
  return model.validationStatus === "validated";
}

export function isModelTransport(value: unknown): value is ModelTransport {
  return (
    typeof value === "string" &&
    MODEL_TRANSPORTS.includes(value as ModelTransport)
  );
}

/**
 * Index a registry while preserving live catalog order. Order is meaningful:
 * the first entry returned by `GET /v1/models` is the setup default.
 */
export function createModelIndex<TRegistry extends ModelRegistry>(
  registry: TRegistry,
): ModelIndex<TRegistry> {
  type RegistryKey = ModelKeyOf<TRegistry>;
  type RegistryModel = ModelRecordFor<TRegistry>;
  type ValidatedRegistryModel = ValidatedModelRecordFor<TRegistry>;

  const modelKeys = Object.keys(registry) as RegistryKey[];
  const models: RegistryModel[] = [];
  const validatedModels: ValidatedRegistryModel[] = [];
  const validatedModelKeys: ValidatedRegistryModel["key"][] = [];

  for (const key of modelKeys) {
    const model = toModelRecord(key, registry[key]);
    models.push(model);

    if (!isValidatedModel(model)) {
      continue;
    }

    validatedModels.push(model);
    validatedModelKeys.push(model.key);
  }

  return {
    modelKeys: Object.freeze(modelKeys),
    models: Object.freeze(models),
    validatedModelKeys: Object.freeze(validatedModelKeys),
    validatedModels: Object.freeze(validatedModels),
  };
}

export function formatMimoCodeModelRef<TKey extends string>(
  model: TKey | { key: TKey },
): MimoCodeModelRef<TKey> {
  const modelKey = typeof model === "string" ? model : model.key;
  return `gonkagate/${modelKey}`;
}
