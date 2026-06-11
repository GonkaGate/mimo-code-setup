import assert from "node:assert/strict";
import test from "node:test";
import {
  applyManagedConfigValues,
  MIMOCODE_SCHEMA_URL,
} from "../../src/install/config.js";
import { getConfigValue } from "../../src/install/config-value.js";
import { parseJsoncDocument, setJsoncValue } from "../../src/install/jsonc.js";
import { InstallerError } from "../../src/install/errors.js";

test("JSONC helper parses empty, JSON, comments, and rejects invalid syntax", () => {
  assert.deepEqual(parseJsoncDocument("").data, {});
  assert.equal(parseJsoncDocument('{"a":1}').data.a, 1);
  assert.equal(parseJsoncDocument('{\n  // keep\n  "a": 1\n}\n').data.a, 1);
  assert.throws(() => parseJsoncDocument("{", "bad.jsonc"), InstallerError);
});

test("JSONC helper uses structured edits and preserves unrelated keys, EOL, and newline style", () => {
  const source = '{\r\n  // keep\r\n  "other": true\r\n}\r\n';
  const updated = setJsoncValue(source, ["provider", "gonkagate"], {
    name: "GonkaGate",
  });
  const parsed = parseJsoncDocument(updated);

  assert.match(updated, /\r\n/);
  assert.match(updated, /\/\/ keep/);
  assert.equal(updated.endsWith("\r\n"), true);
  assert.equal(getConfigValue(parsed.data, ["other"]), true);
  assert.deepEqual(getConfigValue(parsed.data, ["provider", "gonkagate"]), {
    name: "GonkaGate",
  });
});

test("managed config values add schema and preserve unrelated config", () => {
  const updated = applyManagedConfigValues('{"ui":{"theme":"dark"}}\n', [
    { path: ["model"], value: "gonkagate/test" },
  ]);
  const parsed = parseJsoncDocument(updated);

  assert.equal(getConfigValue(parsed.data, ["$schema"]), MIMOCODE_SCHEMA_URL);
  assert.equal(getConfigValue(parsed.data, ["ui", "theme"]), "dark");
  assert.equal(getConfigValue(parsed.data, ["model"]), "gonkagate/test");
});
