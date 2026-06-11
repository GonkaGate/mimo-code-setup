export function getConfigValue(
  value: unknown,
  path: readonly (string | number)[],
): unknown {
  let current = value;

  for (const segment of path) {
    if (current === null || typeof current !== "object") {
      return undefined;
    }

    current = (current as Record<string, unknown>)[String(segment)];
  }

  return current;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
