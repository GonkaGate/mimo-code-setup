import assert from "node:assert/strict";
import test from "node:test";
import {
  assertMatchesAll,
  assertMirroredSkillDirectory,
  readText,
} from "./contract-helpers.js";

const mirroredSkillDirectories = [
  "mimocode-compatibility-audit",
  "code-simplification",
  "coding-prompt-normalizer",
  "node-security-review",
  "planning-and-task-breakdown",
  "spec-first-brainstorming",
  "technical-design-review",
  "typescript-coder",
  "typescript-coder-plan-spec",
  "typescript-error-modeling-and-boundaries",
  "typescript-node-esm-compiler-runtime",
  "typescript-public-api-design",
  "typescript-refactoring-and-simplification-patterns",
  "typescript-runtime-boundary-modeling",
  "typescript-systematic-debugging",
  "typescript-type-safety-review",
  "verification-before-completion",
] as const;

test("mirrored skill assets stay aligned across .agents and .claude", () => {
  for (const skillDirectory of mirroredSkillDirectories) {
    assertMirroredSkillDirectory(skillDirectory);
  }
});

test("AGENTS documents the mirrored skill pack", () => {
  const agents = readText("AGENTS.md");

  assertMatchesAll(agents, [
    /\.agents\/skills\//,
    /\.claude\/skills\//,
    /mirrored skill pack/i,
  ]);
});

test("the imported skill pack includes MiMoCode-aware high-value entries", () => {
  const mimocodeCompatibilityAudit = readText(
    ".agents/skills/mimocode-compatibility-audit/SKILL.md",
  );
  const mimocodeCompatibilityAuditTemplate = readText(
    ".agents/skills/mimocode-compatibility-audit/references/report-template.md",
  );
  const codingPromptNormalizer = readText(
    ".agents/skills/coding-prompt-normalizer/SKILL.md",
  );
  const codingPromptRepoRouting = readText(
    ".agents/skills/coding-prompt-normalizer/references/repo-context-routing.md",
  );
  const codingPromptInputNormalization = readText(
    ".agents/skills/coding-prompt-normalizer/references/input-normalization.md",
  );
  const codingPromptEvals = readText(
    ".agents/skills/coding-prompt-normalizer/evals/evals.json",
  );
  const codeSimplification = readText(
    ".agents/skills/code-simplification/SKILL.md",
  );
  const planningAndTaskBreakdown = readText(
    ".agents/skills/planning-and-task-breakdown/SKILL.md",
  );
  const verificationSkill = readText(
    ".agents/skills/verification-before-completion/SKILL.md",
  );

  assert.match(codeSimplification, /Code Simplification/);
  assert.match(codeSimplification, /AGENTS\.md/);
  assert.match(codeSimplification, /npm run ci/);
  assert.match(
    codeSimplification,
    /typescript-refactoring-and-simplification-patterns/,
  );

  assertMatchesAll(codingPromptNormalizer, [
    /coding-prompt-normalizer/,
    /mimo-code-setup/,
    /npx @gonkagate\/mimo-code-setup/,
    /~\/\.config\/mimocode\/mimocode\.json/,
    /GONKAGATE_API_KEY/,
    /--api-key-stdin/,
    /provider\.gonkagate/,
    /chat_completions/,
    /src\/install\//,
    /installer runtime/,
    /minimum supported upstream MiMoCode version/,
    /newer MiMoCode versions must not be blocked/,
  ]);
  assert.doesNotMatch(codingPromptNormalizer, /codex-setup/);
  assert.doesNotMatch(codingPromptNormalizer, /not_implemented/);
  assert.doesNotMatch(codingPromptNormalizer, /not implemented yet/i);

  assertMatchesAll(codingPromptRepoRouting, [
    /mimo-code-setup/,
    /src\/cli\.ts/,
    /docs\/specs\/mimo-code-setup-prd\/spec\.md/,
    /provider\.gonkagate/,
  ]);
  assert.doesNotMatch(codingPromptRepoRouting, /bin\/gonkagate-codex\.js/);

  assertMatchesAll(codingPromptInputNormalization, [
    /~\/\.config\/mimocode\/mimocode\.json/,
    /GONKAGATE_API_KEY/,
    /--api-key-stdin/,
    /provider\.gonkagate/,
  ]);
  assert.doesNotMatch(codingPromptInputNormalization, /wire_api/);

  assertMatchesAll(codingPromptEvals, [
    /mimo-code-setup/,
    /~\/\.config\/mimocode\/mimocode\.json/,
    /chat_completions/,
  ]);
  assert.doesNotMatch(codingPromptEvals, /npx @gonkagate\/codex-setup/);

  assert.match(planningAndTaskBreakdown, /Planning and Task Breakdown/);
  assert.match(
    planningAndTaskBreakdown,
    /docs\/specs\/mimo-code-setup-prd\/spec\.md/,
  );
  assert.match(planningAndTaskBreakdown, /AGENTS\.md/);
  assert.match(planningAndTaskBreakdown, /npm run ci/);
  assert.match(verificationSkill, /verification-before-completion/i);

  assertMatchesAll(mimocodeCompatibilityAudit, [
    /mimocode-compatibility-audit/,
    /@mimo-ai\/cli/,
    /github\.com\/XiaomiMiMo\/MiMo-Code/,
    /~\/\.config\/mimocode\/mimocode\.json/,
    /MIMOCODE_CONFIG_CONTENT/,
    /provider\.gonkagate/,
    /small_model/,
    /@ai-sdk\/openai-compatible/,
    /@ai-sdk\/openai/,
    /mimo providers login/,
  ]);
  assert.doesNotMatch(mimocodeCompatibilityAudit, /@openai\/codex/);
  assert.doesNotMatch(mimocodeCompatibilityAudit, /opencode/i);
  assert.match(
    mimocodeCompatibilityAuditTemplate,
    /Stable `@mimo-ai\/cli` version audited/,
  );
});
