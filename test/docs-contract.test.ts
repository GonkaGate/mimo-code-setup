import assert from "node:assert/strict";
import test from "node:test";
import {
  assertMatchesAll,
  escapeRegExp,
  readText,
} from "./contract-helpers.js";
import { CONTRACT_METADATA } from "../src/constants/contract.js";
import {
  GONKAGATE_BASE_URL,
  MANAGED_SECRET_FILE_REF,
} from "../src/constants/gateway.js";

test("README documents the scaffold honestly", () => {
  const readme = readText("README.md");

  assertMatchesAll(readme, [
    /@gonkagate\/mimo-code-setup/,
    /npx @gonkagate\/mimo-code-setup/,
    /MiMoCode/,
    /the shipped runtime/i,
    /GET \/v1\/models/,
    /live-catalog-first/,
    /stable provider id is `gonkagate`/,
    new RegExp(escapeRegExp(GONKAGATE_BASE_URL)),
    new RegExp(escapeRegExp(MANAGED_SECRET_FILE_REF)),
    /npm run ci/,
  ]);
  assert.doesNotMatch(readme, /candidate-only registry blocks setup/i);
});

test("AGENTS pins the current repo truth and fixed product invariants", () => {
  const agents = readText("AGENTS.md");

  assertMatchesAll(agents, [
    /@\/Users\/daniil\/\.codex\/RTK\.md/,
    /@RTK\.md/,
    /Current honest state:/,
    /src\/cli\.ts.*installer runtime/s,
    /src\/install\/` contains the runtime contracts/s,
    /GET https:\/\/api\.gonkagate\.com\/v1\/models/s,
    /provider\.gonkagate\.options\.setCacheKey = false/,
    /@gonkagate\/mimo-code-setup/,
    /target upstream package: `@mimo-ai\/cli`/,
    /~\/\.config\/mimocode\/mimocode\.json/,
    /mimocode\.jsonc.*mimocode\.json.*config\.json/s,
    /MIMOCODE_CONFIG.*after global config.*before\s+project\/local config/s,
    /\.mimocode\/mimocode\.json/,
    /MIMOCODE_CONFIG_CONTENT/,
    /mimo --pure debug config/,
    /not a guaranteed no-write command/,
    /provider\.gonkagate\.options\.apiKey = \{file:~\/\.gonkagate\/mimo-code\/api-key\}/,
    /mirrored local skill packs/i,
    /npm run ci/,
  ]);
  assert.doesNotMatch(agents, /OpenCode/);
  assert.doesNotMatch(agents, /opencode/);
});

test("docs preserve security and MiMoCode verification constraints", () => {
  const howItWorks = readText("docs/how-it-works.md");
  const security = readText("docs/security.md");
  const troubleshooting = readText("docs/troubleshooting.md");
  const combined = `${howItWorks}\n${security}\n${troubleshooting}`;

  assertMatchesAll(combined, [
    /mimo debug paths/,
    /mimo --pure debug config/,
    /mimo models gonkagate/,
    /MIMOCODE_CONFIG/,
    /MIMOCODE_CONFIG_CONTENT/,
    /MIMOCODE_CONFIG_DIR/,
    /MIMOCODE_HOME/,
    /may let upstream normalize schema-less config files/,
    /@ai-sdk\/openai-compatible/,
    /@ai-sdk\/openai/,
    /auth\.json/,
    /Do not ask users to paste raw `mimo --pure debug config` output/,
    new RegExp(escapeRegExp(MANAGED_SECRET_FILE_REF)),
  ]);
});

test("model validation docs separate live catalog availability from workflow proof", () => {
  const modelValidation = readText("docs/model-validation.md");

  assertMatchesAll(modelValidation, [
    /not the public picker allowlist/i,
    /workflow proof ledger/i,
    /qwen\/qwen3-235b-a22b-instruct-2507-fp8/,
    /moonshotai\/kimi-k2\.6/,
    /minimaxai\/minimax-m2\.7/,
    /public GonkaGate models page/,
    /240K context/,
    /180K context/,
    /setCacheKey.*false/s,
    /mimo models gonkagate/,
  ]);
});

test("PRD remains the product source of truth", () => {
  const prd = readText("docs/specs/mimo-code-setup-prd/spec.md");

  assertMatchesAll(prd, [
    /@gonkagate\/mimo-code-setup/,
    /@mimo-ai\/cli/,
    /MIMOCODE_CONFIG_CONTENT/,
    /MIMOCODE_CONFIG_DIR/,
    /mimo --pure debug config/,
    /not as a guaranteed no-write command/,
    /provider\.gonkagate/,
    /~\/\.gonkagate\/mimo-code\/api-key/,
    /https:\/\/api\.gonkagate\.com\/v1/,
  ]);
});

test("runtime contract map names every truth flip surface", () => {
  const contractMap = readText("docs/runtime-contract-map.md");

  assertMatchesAll(contractMap, [
    /AGENTS\.md/,
    /README\.md/,
    /docs\/how-it-works\.md/,
    /docs\/security\.md/,
    /docs\/model-validation\.md/,
    /docs\/troubleshooting\.md/,
    /CHANGELOG\.md/,
    /src\/constants\/contract\.ts/,
    /test\/docs-contract\.test\.ts/,
    /test\/package-contract\.test\.ts/,
    /test\/cli\.test\.ts/,
    /same public setup behavior/i,
  ]);
});

test("release files target the new package identity", () => {
  const changelog = readText("CHANGELOG.md");
  const releaseManifest = JSON.parse(
    readText(".release-please-manifest.json"),
  ) as {
    ".": string;
  };

  assert.match(changelog, /@gonkagate\/mimo-code-setup/);
  assert.equal(releaseManifest["."], CONTRACT_METADATA.cliVersion);
});
