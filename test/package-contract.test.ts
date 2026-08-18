import assert from "node:assert/strict";
import test from "node:test";
import { CONTRACT_METADATA } from "../src/constants/contract.js";
import {
  CURRENT_PROVIDER_PACKAGE,
  CURRENT_TRANSPORT,
  CREATED_GLOBAL_CONFIG_FILENAME,
  DOCUMENTED_GLOBAL_CONFIG_PATH,
  GONKAGATE_BASE_URL,
  GONKAGATE_PROVIDER_ID,
  GLOBAL_CONFIG_FILENAMES,
  MANAGED_SECRET_FILE_REF,
  TARGET_CLI,
} from "../src/constants/gateway.js";
import { formatMimoCodeModelRef } from "../src/constants/models.js";
import { MODEL_VALIDATION_RECORDS } from "../src/constants/model-validation.js";
import { readText } from "./contract-helpers.js";

interface PackageJson {
  bin: Record<string, string>;
  dependencies: Record<string, string>;
  description: string;
  devDependencies: Record<string, string>;
  engines: Record<string, string>;
  files: string[];
  keywords: string[];
  name: string;
  packageManager: string;
  repository: { url: string };
  scripts: Record<string, string>;
  type: string;
  version: string;
}

function readPackageJson(): PackageJson {
  return JSON.parse(readText("package.json")) as PackageJson;
}

test("package metadata matches the public MiMoCode setup contract", () => {
  const packageJson = readPackageJson();

  assert.equal(packageJson.name, CONTRACT_METADATA.packageName);
  assert.equal(packageJson.version, CONTRACT_METADATA.cliVersion);
  assert.equal(packageJson.type, "module");
  assert.match(packageJson.description, /MiMoCode/i);
  assert.match(packageJson.repository.url, /GonkaGate\/mimo-code-setup/);
  assert.equal(
    packageJson.bin[CONTRACT_METADATA.binName],
    CONTRACT_METADATA.binPath,
  );
  assert.equal(
    packageJson.bin[CONTRACT_METADATA.legacyBinName],
    CONTRACT_METADATA.binPath,
  );
  assert.equal(packageJson.engines.node, ">=22.14.0");
  assert.equal(packageJson.packageManager, "npm@11.11.1");
  assert.ok(packageJson.files.includes("bin"));
  assert.ok(packageJson.files.includes("dist"));
  assert.ok(packageJson.files.includes("docs"));
  assert.ok(packageJson.keywords.includes("mimocode"));
});

test("package keeps the inherited development toolchain ready", () => {
  const packageJson = readPackageJson();

  assert.equal(packageJson.scripts.build, "tsc -p tsconfig.build.json");
  assert.equal(
    packageJson.scripts.test,
    "npm run build && node scripts/run-tests.mjs",
  );
  assert.match(packageJson.scripts.ci, /npm run typecheck/);
  assert.match(packageJson.scripts.ci, /npm run package:check/);
  assert.match(packageJson.scripts["package:check"], /npm run package:smoke/);
  assert.equal(
    packageJson.scripts["package:smoke"],
    "node scripts/package-smoke.mjs",
  );
  assert.ok(packageJson.dependencies.commander);
  assert.ok(packageJson.dependencies["jsonc-parser"]);
  assert.ok(packageJson.dependencies.semver);
  assert.ok(packageJson.dependencies["write-file-atomic"]);
  assert.ok(packageJson.devDependencies.typescript);
  assert.ok(packageJson.devDependencies.tsx);
  assert.ok(packageJson.devDependencies.publint);
});

test("constants pin the planned GonkaGate MiMoCode provider contract", () => {
  assert.equal(TARGET_CLI, "mimo");
  assert.equal(GONKAGATE_PROVIDER_ID, "gonkagate");
  assert.equal(GONKAGATE_BASE_URL, "https://api.gonkagate.com/v1");
  assert.equal(CURRENT_TRANSPORT, "chat_completions");
  assert.equal(CURRENT_PROVIDER_PACKAGE, "@ai-sdk/openai-compatible");
  assert.equal(
    DOCUMENTED_GLOBAL_CONFIG_PATH,
    "~/.config/mimocode/mimocode.json",
  );
  assert.deepEqual(GLOBAL_CONFIG_FILENAMES, [
    "mimocode.jsonc",
    "mimocode.json",
    "config.json",
  ]);
  assert.equal(CREATED_GLOBAL_CONFIG_FILENAME, "mimocode.jsonc");
  assert.equal(
    MANAGED_SECRET_FILE_REF,
    "{file:~/.gonkagate/mimo-code/api-key}",
  );
  assert.equal(
    CONTRACT_METADATA.publicEntrypoint,
    "npx @gonkagate/mimo-code-setup",
  );
  assert.equal(CONTRACT_METADATA.mimoCode.packageName, "@mimo-ai/cli");
});

test("model metadata constants keep no checked-in catalog", () => {
  const modelConstants = readText("src/constants/models.ts");

  assert.doesNotMatch(modelConstants, /deepseek|kimi|minimax|qwen/i);
  assert.doesNotMatch(modelConstants, /context:\s*\d/);
  assert.doesNotMatch(modelConstants, /recommended/i);
  assert.equal(
    Object.keys(CONTRACT_METADATA).includes("curatedRegistry"),
    false,
  );
  assert.match(CONTRACT_METADATA.publicState, /\/v1\/models/);

  const catalog = readText("src/install/model-catalog.ts");
  assert.match(catalog, /context_length/);
  assert.match(catalog, /contextLength/);

  assert.equal(
    formatMimoCodeModelRef("moonshotai/kimi-k2.6"),
    "gonkagate/moonshotai/kimi-k2.6",
  );
});

test("the MiMoCode workflow proof ledger stays self-consistent", () => {
  const records = Object.entries(MODEL_VALIDATION_RECORDS);
  assert.ok(records.length > 0);

  for (const [key, record] of records) {
    assert.equal(record.modelKey, key);
    assert.equal(record.providerPackage, "@ai-sdk/openai-compatible");
    assert.equal(record.transport, "chat_completions");
  }

  const kimi = MODEL_VALIDATION_RECORDS["moonshotai/kimi-k2.6"];
  assert.equal(kimi?.modelKey, "moonshotai/kimi-k2.6");
  assert.equal(kimi?.providerPackage, "@ai-sdk/openai-compatible");
  assert.equal(kimi?.transport, "chat_completions");
  assert.equal(kimi?.mimoRun, true);
  assert.equal(kimi?.streamingText, true);
  assert.equal(kimi?.toolCalling, true);
  assert.equal(kimi?.fileEditLoop, true);
  assert.equal(kimi?.userScope, true);
  assert.equal(kimi?.projectScope, true);
  assert.equal(kimi?.debugConfigProof, true);
  assert.equal(kimi?.mimoModelsProof, true);
});
