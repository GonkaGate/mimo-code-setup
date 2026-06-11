import type { InstallerDeps } from "./deps.js";
import { InstallerError } from "./errors.js";

export interface SecretInputRequest {
  apiKeyStdin?: boolean;
}

export interface SecretInputResult {
  key: string;
  source: "env" | "stdin" | "prompt";
}

export async function collectGonkaGateApiKey(
  request: SecretInputRequest,
  deps: InstallerDeps,
): Promise<SecretInputResult> {
  if (request.apiKeyStdin === true) {
    return validateSecret(await deps.readStdin(), "stdin");
  }

  const envKey = deps.env().GONKAGATE_API_KEY;
  if (envKey !== undefined) {
    return validateSecret(envKey, "env");
  }

  if (deps.streams.stdin.isTTY === true && deps.streams.stdout.isTTY === true) {
    return validateSecret(
      await deps.prompts.password("GonkaGate API key"),
      "prompt",
    );
  }

  throw new InstallerError({
    category: "secret_intake",
    code: "non_interactive_secret_required",
    message:
      "A GonkaGate API key is required. Use a hidden prompt, GONKAGATE_API_KEY, or --api-key-stdin.",
  });
}

export function validateSecret(
  rawValue: string,
  source: SecretInputResult["source"],
): SecretInputResult {
  const key = rawValue.trim();

  if (key.length === 0) {
    throw new InstallerError({
      category: "secret_intake",
      code: "missing_api_key",
      message: "A GonkaGate API key was not provided.",
    });
  }

  if (!/^gp-[A-Za-z0-9_-]+$/u.test(key)) {
    throw new InstallerError({
      category: "secret_intake",
      code: "invalid_api_key",
      message: "The GonkaGate API key must start with gp-.",
      detail: "invalid secret input was redacted",
    });
  }

  return { key, source };
}
