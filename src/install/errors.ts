import type {
  InstallerErrorCategory,
  InstallerErrorCode,
  InstallerErrorShape,
} from "./contracts.js";
import { redactText } from "./redact.js";

export class InstallerError extends Error implements InstallerErrorShape {
  readonly category: InstallerErrorCategory;
  readonly code: InstallerErrorCode;
  readonly detail?: string;

  constructor(input: InstallerErrorShape) {
    super(redactText(input.message));
    this.name = "InstallerError";
    this.category = input.category;
    this.code = input.code;
    this.detail =
      input.detail === undefined ? undefined : redactText(input.detail);
  }
}

export function toInstallerError(error: unknown): InstallerError {
  if (error instanceof InstallerError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);

  return new InstallerError({
    category: "unexpected",
    code: "unexpected_error",
    message,
  });
}

export function createBlocker(
  error: InstallerError,
  source:
    | "cli"
    | "mimocode"
    | "secret"
    | "storage"
    | "config"
    | "verification"
    | "model_registry"
    | "current_session",
) {
  return {
    code: error.code,
    detail: error.detail,
    message: error.message,
    source,
  } as const;
}
