const SECRET_VALUE_PATTERN = /gp-[A-Za-z0-9_-]+/g;
const FILE_SECRET_PATTERN = /(["']?apiKey["']?\s*[:=]\s*)["'][^"']*["']/gi;

export function redactText(value: unknown): string {
  return String(value)
    .replace(SECRET_VALUE_PATTERN, "gp-[redacted]")
    .replace(FILE_SECRET_PATTERN, '$1"[redacted]"');
}

export function redactJsonValue<T>(value: T): T {
  if (typeof value === "string") {
    return redactText(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => redactJsonValue(entry)) as T;
  }

  if (value !== null && typeof value === "object") {
    const output: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(value)) {
      output[key] = /apiKey|authorization|token|secret/i.test(key)
        ? "[redacted]"
        : redactJsonValue(entry);
    }

    return output as T;
  }

  return value;
}
