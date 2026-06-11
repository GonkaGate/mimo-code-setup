import {
  CURRENT_PROVIDER_PACKAGE,
  CURRENT_TRANSPORT,
  GONKAGATE_BASE_URL,
} from "../constants/gateway.js";
import type {
  CuratedModelDefinition,
  CuratedModelRegistry,
} from "../constants/models.js";
import type { InstallerDeps } from "./deps.js";
import { InstallerError } from "./errors.js";

export const GONKAGATE_MODELS_URL = `${GONKAGATE_BASE_URL}/models` as const;

export async function fetchGonkaGateModelCatalog(
  deps: InstallerDeps,
  apiKey: string,
): Promise<CuratedModelRegistry> {
  let response: Awaited<ReturnType<InstallerDeps["http"]["getJson"]>>;

  try {
    response = await deps.http.getJson(GONKAGATE_MODELS_URL, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
  } catch (error) {
    throw new InstallerError({
      category: "model_registry",
      code: "model_catalog_fetch_failed",
      detail: error instanceof Error ? error.message : String(error),
      message: "Could not fetch the GonkaGate model catalog.",
    });
  }

  if (response.status === 401 || response.status === 403) {
    throw new InstallerError({
      category: "secret_intake",
      code: "invalid_api_key",
      message: "The GonkaGate API key was rejected by /v1/models.",
    });
  }

  if (response.status !== 200) {
    throw new InstallerError({
      category: "model_registry",
      code: "model_catalog_fetch_failed",
      detail: `GET /v1/models returned HTTP ${response.status}.`,
      message: "Could not fetch the GonkaGate model catalog.",
    });
  }

  return parseGonkaGateModelCatalog(response.body);
}

export function parseGonkaGateModelCatalog(
  body: unknown,
): CuratedModelRegistry {
  if (!isRecord(body) || body.object !== "list" || !Array.isArray(body.data)) {
    throw new InstallerError({
      category: "model_registry",
      code: "model_catalog_parse_failed",
      message: "GonkaGate /v1/models returned an unexpected catalog shape.",
    });
  }

  const registry: Record<string, CuratedModelDefinition> = {};

  for (const item of body.data) {
    if (!isRecord(item) || typeof item.id !== "string") {
      throw new InstallerError({
        category: "model_registry",
        code: "model_catalog_parse_failed",
        message: "GonkaGate /v1/models returned a model without a string id.",
      });
    }

    const modelId = item.id;
    if (!isGonkaGateModelId(modelId)) {
      throw new InstallerError({
        category: "model_registry",
        code: "model_catalog_parse_failed",
        message: "GonkaGate /v1/models returned an invalid model id.",
      });
    }

    if (registry[modelId] !== undefined) {
      continue;
    }

    registry[modelId] = {
      adapterPackage: CURRENT_PROVIDER_PACKAGE,
      displayName: modelId,
      modelId,
      recommended: Object.keys(registry).length === 0,
      transport: CURRENT_TRANSPORT,
      validationStatus: "validated",
    };
  }

  if (Object.keys(registry).length === 0) {
    throw new InstallerError({
      category: "model_registry",
      code: "model_catalog_empty",
      message: "GonkaGate /v1/models returned no available models.",
    });
  }

  return registry;
}

function isGonkaGateModelId(value: string): boolean {
  return (
    value.length > 0 &&
    value === value.trim() &&
    !/[\s\u0000-\u001f\u007f]/u.test(value)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
