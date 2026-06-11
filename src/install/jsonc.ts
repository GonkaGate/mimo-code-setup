import {
  applyEdits,
  format,
  modify,
  parse,
  type ParseError,
} from "jsonc-parser";
import { InstallerError } from "./errors.js";

export interface ParsedJsoncDocument {
  data: Record<string, unknown>;
  eol: "\n" | "\r\n";
  trailingNewline: boolean;
}

export function parseJsoncDocument(
  contents: string,
  path = "<memory>",
): ParsedJsoncDocument {
  const normalized = contents.trim().length === 0 ? "{}" : contents;
  const errors: ParseError[] = [];
  const parsed = parse(normalized, errors, { allowTrailingComma: true });

  if (errors.length > 0 || !isRecord(parsed)) {
    throw new InstallerError({
      category: "config_parse",
      code: "config_parse_failed",
      detail: path,
      message: `Could not parse MiMoCode config ${path}.`,
    });
  }

  return {
    data: parsed,
    eol: contents.includes("\r\n") ? "\r\n" : "\n",
    trailingNewline: contents.endsWith("\n") || contents.length === 0,
  };
}

export function setJsoncValue(
  contents: string,
  path: readonly (string | number)[],
  value: unknown,
): string {
  const document = parseJsoncDocument(contents);
  const source = contents.trim().length === 0 ? "{}" : contents;
  const edits = modify(source, [...path], value, {
    formattingOptions: {
      insertSpaces: true,
      tabSize: 2,
      eol: document.eol,
    },
  });
  const updated = applyEdits(source, edits);

  return normalizeTrailingNewline(
    updated,
    document.trailingNewline,
    document.eol,
  );
}

export function deleteJsoncValue(
  contents: string,
  path: readonly (string | number)[],
): string {
  const document = parseJsoncDocument(contents);
  const edits = modify(contents, [...path], undefined, {
    formattingOptions: {
      insertSpaces: true,
      tabSize: 2,
      eol: document.eol,
    },
  });
  const updated = applyEdits(contents, edits);

  return normalizeTrailingNewline(
    updated,
    document.trailingNewline,
    document.eol,
  );
}

export function formatJsonc(contents: string): string {
  const document = parseJsoncDocument(contents);
  const edits = format(contents, undefined, {
    insertSpaces: true,
    tabSize: 2,
    eol: document.eol,
  });

  return normalizeTrailingNewline(
    applyEdits(contents, edits),
    document.trailingNewline,
    document.eol,
  );
}

function normalizeTrailingNewline(
  contents: string,
  trailingNewline: boolean,
  eol: "\n" | "\r\n",
): string {
  const withoutTrailing = contents.replace(/(?:\r?\n)+$/u, "");
  return trailingNewline ? `${withoutTrailing}${eol}` : withoutTrailing;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
