import { setJsoncValue } from "./jsonc.js";

export const MIMOCODE_SCHEMA_URL = "https://opencode.ai/config.json";

export function applyManagedConfigValues(
  contents: string,
  values: readonly {
    path: readonly (string | number)[];
    value: unknown;
  }[],
): string {
  let next = contents.trim().length === 0 ? "{}\n" : contents;

  next = setJsoncValue(next, ["$schema"], MIMOCODE_SCHEMA_URL);

  for (const entry of values) {
    next = setJsoncValue(next, entry.path, entry.value);
  }

  return next;
}
