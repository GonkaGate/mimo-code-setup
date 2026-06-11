import {
  type CuratedModelDefinition,
  type CuratedModelRecord,
  type CuratedModelRegistry,
} from "../constants/models.js";
import type { InstallerDeps } from "./deps.js";
import { InstallerError } from "./errors.js";

export interface ModelSelectionRequest {
  modelKey?: string;
  yes?: boolean;
}

export interface ModelSelection {
  model: CuratedModelRecord;
}

export async function selectValidatedModel(
  request: ModelSelectionRequest,
  deps: InstallerDeps,
  registry: CuratedModelRegistry,
): Promise<ModelSelection> {
  const validatedModels = getValidatedModelRecords(registry);
  const recommendedModels = validatedModels.filter(
    (model) => model.recommended,
  );

  if (validatedModels.length === 0) {
    throw new InstallerError({
      category: "model_registry",
      code: "validated_models_unavailable",
      message:
        "No GonkaGate model is validated for MiMoCode yet. Setup cannot safely continue.",
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
        message: `Model ${request.modelKey} is not validated for MiMoCode setup.`,
      });
    }

    return { model: selected };
  }

  const recommended = recommendedModels[0];
  if (request.yes === true) {
    if (recommended !== undefined) {
      return { model: recommended };
    }

    if (validatedModels.length === 1) {
      return { model: validatedModels[0]! };
    }

    throw new InstallerError({
      category: "model_registry",
      code: "ambiguous_model_selection",
      message:
        "Multiple validated GonkaGate models are available; choose one with --model.",
    });
  }

  const selectedKey = await deps.prompts.select(
    "GonkaGate model",
    validatedModels.map((model) => ({
      name: model.displayName,
      value: model.key,
    })),
  );
  const selected = validatedModels.find((model) => model.key === selectedKey);

  if (selected === undefined) {
    throw new InstallerError({
      category: "model_registry",
      code: "unsupported_model",
      message: "Selected model is not validated for MiMoCode setup.",
    });
  }

  return { model: selected };
}

function getValidatedModelRecords(
  registry: CuratedModelRegistry,
): CuratedModelRecord[] {
  return Object.entries(registry)
    .map(([key, model]) => ({
      ...(model as CuratedModelDefinition),
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
