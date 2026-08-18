import {
  type ModelDefinition,
  type ModelRecord,
  type ModelRegistry,
} from "../constants/models.js";
import type { InstallerDeps } from "./deps.js";
import { InstallerError } from "./errors.js";

export interface ModelSelectionRequest {
  modelKey?: string;
  yes?: boolean;
}

export interface ModelSelection {
  model: ModelRecord;
}

/**
 * Pick the setup model from the live catalog.
 *
 * The non-interactive default is the first model of the live `/v1/models`
 * response, in response order. The gateway owns that order; the installer must
 * not rank, sort, or prefer models on its own.
 */
export async function selectValidatedModel(
  request: ModelSelectionRequest,
  deps: InstallerDeps,
  registry: ModelRegistry,
): Promise<ModelSelection> {
  const validatedModels = getValidatedModelRecords(registry);

  if (validatedModels.length === 0) {
    throw new InstallerError({
      category: "model_registry",
      code: "validated_models_unavailable",
      message:
        "No GonkaGate model is available for MiMoCode setup. Setup cannot safely continue.",
    });
  }

  if (request.modelKey !== undefined) {
    const selected = validatedModels.find(
      (model) => model.key === request.modelKey,
    );
    if (selected === undefined) {
      throw new InstallerError({
        category: "model_registry",
        code: "unsupported_model",
        message: `Model ${request.modelKey} is not available for MiMoCode setup.`,
      });
    }

    return { model: selected };
  }

  if (request.yes === true) {
    return { model: validatedModels[0]! };
  }

  const selectedKey = await deps.prompts.select(
    "GonkaGate model",
    validatedModels.map((model) => ({
      ...(model.description === undefined
        ? {}
        : { description: model.description }),
      name: model.displayName,
      value: model.key,
    })),
  );
  const selected = validatedModels.find((model) => model.key === selectedKey);

  if (selected === undefined) {
    throw new InstallerError({
      category: "model_registry",
      code: "unsupported_model",
      message: "Selected model is not available for MiMoCode setup.",
    });
  }

  return { model: selected };
}

function getValidatedModelRecords(registry: ModelRegistry): ModelRecord[] {
  return Object.entries(registry)
    .map(([key, model]) => ({
      ...(model as ModelDefinition),
      key,
    }))
    .filter((model) => model.validationStatus === "validated");
}

export async function selectScope(
  requestedScope: "user" | "project" | undefined,
  deps: InstallerDeps,
  yes?: boolean,
): Promise<"user" | "project"> {
  if (requestedScope !== undefined) {
    return requestedScope;
  }

  if (yes === true) {
    return "user";
  }

  return deps.prompts.select("Setup scope", [
    { name: "User", value: "user" },
    { name: "Project", value: "project" },
  ]);
}
