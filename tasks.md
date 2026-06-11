# Implementation Plan: Production MiMoCode Setup Runtime

## Overview

This plan moves `@gonkagate/mimo-code-setup` from the current truthful scaffold
to a production-quality installer for local MiMoCode. The target runtime should
match the engineering quality of `opencode-setup` while preserving the
MiMoCode-specific contract: configure `mimo` from `@mimo-ai/cli`, write the
managed `provider.gonkagate` shape, keep secrets outside repositories, verify
the effective MiMoCode config before claiming success, and keep live GonkaGate
session validation as a separate gated model-validation activity.

## Codex Goal Contract

Use this plan as a Goal-mode ledger, not as an open-ended backlog. The Goal is
complete only when the repository has a shipped, tested, documented MiMoCode
installer runtime and the final readiness gate in this file passes.

Suggested Goal:

```text
/goal Implement tasks.md from Task 1 through Task 31 without redefining success
around a smaller slice. Preserve the MiMoCode product and security invariants,
update task checkboxes only after their verification passes, keep a short
checkpoint progress log, and stop as blocked if a required product, security,
model-validation, or upstream-compatibility decision cannot be proven from the
repo artifacts and approved gated checks. Completion requires the Final
Readiness Gate in tasks.md to pass, including rtk npm run ci and the required
focused fake-mimo integration/package smoke checks.
```

Goal success criteria:

- [ ] Every task from Task 1 through Task 31 is completed with its task-level
      verification evidence.
- [ ] Every checkpoint records the commands or artifacts that prove progress.
- [ ] The Final Readiness Gate passes.
- [ ] Public docs, tests, package metadata, constants, and runtime behavior
      agree on the shipped implementation status.
- [ ] No task is marked complete from intent, code presence, or broad CI alone
      when its own verification surface is still missing.

Goal operating loop:

- Refer to tasks as `T001` through `T031`, where `T001` means Task 1 and
  `T031` means Task 31. Keep those identifiers stable in progress reports,
  blocker notes, and handoff prompts.
- Start by rereading `AGENTS.md`, the PRD, current `tasks.md`, and the files
  named by the next unchecked task.
- Work in task order unless a dependency explicitly requires a narrow
  prerequisite repair.
- After each task, run the smallest verification that can falsify that task's
  claim; after each checkpoint, run the checkpoint's command set.
- Record concise progress in the task or checkpoint only from fresh evidence:
  files changed, commands run, tests passed, generated artifacts, or explicit
  blockers.
- Do not continue past a failed verification by treating a later broad command
  as a substitute. Fix the failing task or mark the Goal blocked with the exact
  blocker.

Goal stop conditions:

- Stop as complete only after the Final Readiness Gate passes.
- Stop as blocked when continuing would require an unapproved product change,
  a new security decision, a missing MiMoCode compatibility audit, unavailable
  live model-validation evidence, real credentials, network-only proof outside
  the gated validation plan, or user input.
- If a token, time, or budget limit is reached, summarize completed tasks,
  evidence, blockers, and the next unchecked task. Budget exhaustion is not
  completion.
- If a user changes scope, pause the Goal and reconcile the objective before
  editing unrelated tasks.

## Architecture / Quality Bar

- Keep `src/cli.ts` thin. Move option parsing, execution, and rendering into
  `src/cli/`, and move installer behavior into `src/install/`.
- Use dependency injection for filesystem, command execution, prompts, stdin,
  clock, runtime environment, platform, and path handling. Runtime helpers must
  not reach directly into `process`, real home directories, or real config files
  outside the Node adapter.
- Model installer outcomes as typed `success`, `blocked`, and `failed` results
  with the same semantic shape for human and JSON output.
- Keep pure helpers for path resolution, JSON/JSONC parsing, config mutations,
  provider-catalog generation, blocker detection, redaction, and version
  classification.
- Use fake `mimo` binaries and isolated temp homes/projects for integration
  tests. Normal CI must not require real GonkaGate credentials, network access,
  or a real user MiMoCode profile.
- Treat writes as transactions: create backups before replacement, preserve
  unrelated config, record rollback actions, and roll back changed managed files
  if later verification fails.
- Split verification into raw durable provenance checks, resolved effective
  config checks, `mimo models gonkagate` provider/model visibility checks, and
  current-session override checks.
- Never print raw `mimo --pure debug config` output. Parse it internally and
  expose only redacted diagnostics.
- Keep project scope commit-safe: the project config may contain only
  activation settings and must not contain the raw key, managed secret path, or
  `provider.gonkagate.options.apiKey`.
- Do not copy OpenCode target assumptions blindly. MiMoCode has distinct path
  resolution, config filenames, `MIMOCODE_*` override layers, and provider
  whitelist/blacklist behavior.

## Repository Truth To Preserve

- The repository currently ships a scaffold only.
- `src/cli.ts` intentionally reports `not_implemented`, and `src/install/` does
  not exist yet.
- The product source of truth is
  `docs/specs/mimo-code-setup-prd/spec.md`.
- Package identity remains `@gonkagate/mimo-code-setup`, with public entrypoint
  `npx @gonkagate/mimo-code-setup`.
- Target CLI is `mimo`; target upstream package is `@mimo-ai/cli`.
- Current verified MiMoCode baseline is minimum `0.1.0`, audited on
  2026-06-11.
- Stable provider id is `gonkagate`.
- Canonical base URL is `https://api.gonkagate.com/v1`.
- Current provider package is `@ai-sdk/openai-compatible`.
- Current transport target is `chat_completions`; `/v1/responses` is a future
  migration, not v1 behavior.
- The documented global config example is
  `~/.config/mimocode/mimocode.json`, but the runtime write target must be
  resolved from MiMoCode paths and existing config candidates rather than
  hard-coded from the example.
- `MIMOCODE_CONFIG` is an override layer loaded after global config and before
  project/local config, not a replacement for the global config target.
- `MIMOCODE_CONFIG_CONTENT` is a runtime-only higher-precedence override layer,
  not a durable install target.
- Canonical installer-owned binding is
  `provider.gonkagate.options.apiKey = {file:~/.gonkagate/mimo-code/api-key}`.
- Direct MiMoCode `auth.json` writes are out of scope for v1.
- Shell profile mutation, `.env` generation, arbitrary custom base URLs,
  arbitrary custom model ids, and plain `--api-key` are out of scope.
- Safe secret inputs are hidden prompt, `GONKAGATE_API_KEY`, and
  `--api-key-stdin`.
- Curated model entries are MiMoCode candidates until MiMoCode-specific
  validation proof exists. Only validated entries may be exposed in the public
  picker or written as the managed public model catalog.
- Runtime behavior claims must not be added to README, AGENTS, or docs until
  matching runtime tests and verification proof exist.

## Phase 1: Contract and source-of-truth hardening

### Task 1: Build the scaffold-to-runtime contract map

**Description:** Create the implementation-facing map of which source files,
docs, tests, and constants must change when the repository moves from scaffold
truth to shipped runtime truth. The goal is to prevent accidental docs drift
while implementation work starts.

**Acceptance criteria:**

- [x] The implementation owner can identify every contract file that must flip
      when runtime success becomes real.
- [x] The map keeps scaffold wording until runtime behavior and tests exist.
- [x] The map calls out `AGENTS.md`, `README.md`, `docs/how-it-works.md`,
      `docs/security.md`, `docs/model-validation.md`, `docs/troubleshooting.md`,
      `CHANGELOG.md`, `src/constants/contract.ts`, and contract tests.

**Verification:**

- [x] Manual review confirms no shipped-runtime claim is introduced early.
- [x] Future command: `rtk npm run test -- --test-name-pattern contract` if a
      focused contract-test filter exists by then.

**Evidence:** Added `docs/runtime-contract-map.md` and a contract test for all
truth-flip surfaces. Fresh checks passed: `rtk npm run typecheck`; `rtk npm run
test` (23 tests). No shipped-runtime success claim was introduced.

**Dependencies:** None

**Files likely touched:**

- `tasks.md`
- `test/docs-contract.test.ts`
- `test/package-contract.test.ts`

**Estimated scope:** Small

### Task 2: Pin implementation-ready result and error contracts

**Description:** Define the installer result contract and typed error taxonomy
before adding runtime behavior. This should cover `success`, `blocked`, and
`failed` outcomes; redacted diagnostic payloads; machine-readable JSON output;
and stable error codes for support and tests.

**Acceptance criteria:**

- [x] Result contracts include model, scope, provider, MiMoCode version, config
      targets, durable verification state, and current-session verification
      state without exposing secrets.
- [x] Error contracts distinguish detection, version, secret intake, config
      parse, config write, rollback, effective-config, model visibility, and
      blocker attribution failures.
- [x] All user-facing error rendering passes through redaction helpers.

**Verification:**

- [x] Focused typecheck: `rtk npm run typecheck`.
- [x] Focused tests cover redaction and JSON shape for representative errors.

**Evidence:** Added `src/install/contracts.ts`, `src/install/errors.ts`, and
`src/install/redact.ts`; added focused installer contract/error redaction tests.
Fresh checks passed: `rtk npm run typecheck`; `rtk npm run test` (23 tests).

**Dependencies:** Task 1

**Files likely touched:**

- `src/install/contracts/*.ts`
- `src/install/errors.ts`
- `src/install/redact.ts`
- `src/cli/render.ts`
- `test/install/errors.test.ts`
- `test/cli.test.ts`

**Estimated scope:** Medium

### Task 3: Add the initial fake-MiMoCode test harness contract

**Description:** Specify and add the test harness shape for fake `mimo`
executables, isolated home directories, fake project roots, fake runtime
environment variables, and command-output fixtures.

**Acceptance criteria:**

- [x] Tests can run without touching real `~/.config/mimocode`,
      `~/.gonkagate`, or repository-local user config.
- [x] The harness can emulate `mimo --version`, `mimo debug paths`,
      `mimo --pure debug config`, and `mimo models gonkagate`.
- [x] The harness can emit secret-bearing resolved config to prove redaction.

**Verification:**

- [x] Focused tests prove harness isolation and command capture.
- [x] Future command: `rtk npm run test`.

**Evidence:** Added `test/install/harness.ts` with isolated temp home/project
roots and fake `mimo` command fixtures. Fresh checks passed: `rtk npm run
typecheck`; `rtk npm run test` (23 tests).

**Dependencies:** Task 1

**Files likely touched:**

- `test/install/harness.ts`
- `test/install/test-deps.ts`
- `test/install/fixtures/*`
- `scripts/run-tests.mjs`

**Estimated scope:** Medium

## Checkpoint: After Tasks 1-3

- [x] Scaffold truth is still intact.
- [x] The runtime contract has typed result and error seams.
- [x] The test harness can support later implementation without real user
      config, credentials, or network.
- [x] Future command: `rtk npm run typecheck`.

**Checkpoint evidence:** `rtk npm run typecheck` and `rtk npm run test` passed
after T001-T003 changes.

## Phase 2: Runtime foundation and dependency injection

### Task 4: Create `src/install/` runtime module layout

**Description:** Add the production installer module layout using the
`opencode-setup` style: a runtime orchestrator, context resolver, dependency
adapter, path helpers, secrets, storage, config mutation, verification, and
state modules.

**Acceptance criteria:**

- [x] `src/install/README.md` documents the runtime module responsibilities.
- [x] `src/install/index.ts` exposes the installer orchestration entrypoint but
      does not perform unmanaged writes.
- [x] Topic-specific modules keep clear boundaries and avoid circular
      ownership.

**Verification:**

- [x] Focused typecheck: `rtk npm run typecheck`.
- [x] Manual review confirms no direct process/fs use outside dependency
      adapters.

**Evidence:** Added `src/install/README.md`, `src/install/index.ts`,
`src/install/context.ts`, dependency/redaction/contracts modules, and public
docs/tests reflecting that the runtime foundation exists but setup success is
still not implemented. Fresh checks passed: `rtk npm run typecheck`; `rtk npm
run test` (28 tests).

**Dependencies:** Tasks 2-3

**Files likely touched:**

- `src/install/README.md`
- `src/install/index.ts`
- `src/install/contracts.ts`
- `src/install/context.ts`
- `src/install/deps.ts`
- `test/install/*.test.ts`

**Estimated scope:** Medium

### Task 5: Implement Node runtime dependencies and test doubles

**Description:** Implement the real Node dependency adapter and matching test
doubles for filesystem, command execution, prompts, stdin, clock, runtime
environment, and platform/path behavior.

**Acceptance criteria:**

- [x] Production adapter handles POSIX, WSL, native Windows, and Windows command
      shim resolution.
- [x] Test adapter can simulate filesystem permissions, command failures,
      stdout/stderr, environment variables, and current working directory.
- [x] Helpers normalize Windows and Git Bash style paths without leaking that
      logic into business rules.

**Verification:**

- [x] Focused tests cover POSIX path handling, Windows path handling, command
      resolution, stdin, prompt, and clock overrides.
- [x] Future command: `rtk npm run test`.

**Evidence:** Added Node dependency adapter, platform/path helpers, reusable
`test/install/test-deps.ts`, and focused adapter/test-double coverage. Fresh
checks passed: `rtk npm run typecheck`; `rtk npm run test` (28 tests).

**Dependencies:** Task 4

**Files likely touched:**

- `src/install/deps.ts`
- `src/install/platform-path.ts`
- `test/install/deps.test.ts`
- `test/install/test-deps.ts`

**Estimated scope:** Medium

### Task 6: Split CLI parsing, execution, and rendering

**Description:** Reshape the scaffolded CLI into a thin public wrapper over
`src/cli/parse.ts`, `src/cli/execute.ts`, and `src/cli/render.ts`, while
keeping scaffold behavior until the installer runtime is ready to flip.

**Acceptance criteria:**

- [x] `src/cli.ts` remains a thin exported entrypoint.
- [x] Parser owns flags and rejects plain `--api-key` before any secret
      handling.
- [x] Renderer owns human and JSON output and always redacts secret-bearing
      text.

**Verification:**

- [x] CLI help/version tests continue to pass.
- [x] JSON scaffold output remains truthful until the runtime flip task.
- [x] Future command: `rtk npm run test`.

**Evidence:** Split CLI into `src/cli/parse.ts`, `src/cli/execute.ts`,
`src/cli/render.ts`, and `src/cli/contracts.ts`; preserved the public
`renderCliEntrypointError` export and scaffold JSON/text result. Fresh checks
passed: `rtk npm run typecheck`; `rtk npm run test` (28 tests).

**Dependencies:** Tasks 2, 4

**Files likely touched:**

- `src/cli.ts`
- `src/cli/contracts.ts`
- `src/cli/parse.ts`
- `src/cli/execute.ts`
- `src/cli/render.ts`
- `test/cli.test.ts`

**Estimated scope:** Medium

## Checkpoint: After Tasks 4-6

- [x] Runtime modules exist but do not yet claim successful setup.
- [x] CLI seams are testable without real user config.
- [x] Direct runtime side effects are behind dependency interfaces.
- [x] Future command: `rtk npm run typecheck && rtk npm run test`.

**Checkpoint evidence:** `rtk npm run typecheck` and `rtk npm run test` passed
after T004-T006 changes.

## Phase 3: MiMoCode detection and path/config resolution

### Task 7: Implement MiMoCode detection and version policy

**Description:** Detect local `mimo`, parse the installed version, compare it to
the audited `@mimo-ai/cli` `0.1.0` baseline, and produce clear outcomes for
missing, old, exact-minimum, and newer-than-audited versions.

**Acceptance criteria:**

- [x] Missing `mimo` fails with MiMoCode install guidance.
- [x] Versions below `0.1.0` fail with an upgrade message.
- [x] Version `0.1.0` proceeds as the audited baseline.
- [x] Versions newer than `0.1.0` follow an explicit risk policy instead of
      silently claiming fresh compatibility.

**Verification:**

- [x] Focused tests cover missing CLI, unparseable version, old version,
      exact baseline, and newer version.
- [x] Future command: `rtk npm run test`.

**Evidence:** Added `src/install/mimocode.ts` with audited-baseline version
classification and explicit newer-version policy. Fresh checks passed: `rtk npm
run typecheck`; `rtk npm run test` (34 tests).

**Dependencies:** Tasks 4-5

**Files likely touched:**

- `src/install/mimocode.ts`
- `src/install/errors.ts`
- `src/constants/contract.ts`
- `test/install/mimocode.test.ts`

**Estimated scope:** Small

### Task 8: Resolve MiMoCode global paths and config candidates

**Description:** Resolve global MiMoCode config paths by preferring
`mimo debug paths` when available, falling back to MiMoCode-compatible
`MIMOCODE_HOME` and XDG resolution, and choosing the correct global config
target from existing `mimocode.jsonc`, `mimocode.json`, or `config.json`.

**Acceptance criteria:**

- [x] `MIMOCODE_HOME` changes config, data, state, and cache roots when set to
      an absolute path.
- [x] Existing global config candidates are preserved instead of replaced.
- [x] `mimocode.jsonc` is created only when no global config candidate exists.
- [x] Verification can inspect all global candidates in MiMoCode merge order:
      `config.json`, then `mimocode.json`, then `mimocode.jsonc`, not only the
      write target.
- [x] Target-selection tests cover each candidate filename and the
      multiple-existing-candidates case.

**Verification:**

- [x] Focused tests cover `mimo debug paths`, fallback resolution,
      `MIMOCODE_HOME`, and global candidate precedence.
- [x] Future command: `rtk npm run test`.

**Evidence:** Added `src/install/paths.ts` global path parsing/fallback and
target selection with MiMoCode merge-order candidates. Fresh checks passed:
`rtk npm run typecheck`; `rtk npm run test` (34 tests).

**Dependencies:** Task 7

**Files likely touched:**

- `src/install/paths.ts`
- `src/install/context.ts`
- `src/install/verify-layers.ts`
- `test/install/paths.test.ts`
- `test/install/fixtures/mimocode-paths/*`

**Estimated scope:** Medium

### Task 9: Resolve project roots and MiMoCode project/local layers

**Description:** Resolve project root from current working directory or nearest
git root, target `.mimocode/mimocode.json` for project-scope writes, and model
the project/local config layers MiMoCode can discover for verification.

**Acceptance criteria:**

- [x] Git-root discovery works through the DI filesystem.
- [x] When git discovery is unavailable, current working directory is used and
      the user-facing result says so.
- [x] The v1 project write target is always
      `<project-root>/.mimocode/mimocode.json`.
- [x] Verification can inspect root `mimocode.json(c)`, `.mimocode` files,
      `MIMOCODE_CONFIG_DIR`, and `MIMOCODE_DISABLE_PROJECT_CONFIG` effects.

**Verification:**

- [x] Focused tests cover git root, non-git root, disabled project config, and
      discovered local config blockers.
- [x] Future command: `rtk npm run test`.

**Evidence:** Added project-root discovery and project/local layer modeling in
`src/install/paths.ts` plus inspectable layer listing in
`src/install/verify-layers.ts`. Fresh checks passed: `rtk npm run typecheck`;
`rtk npm run test` (34 tests).

**Dependencies:** Task 8

**Files likely touched:**

- `src/install/paths.ts`
- `src/install/context.ts`
- `src/install/verify-layers.ts`
- `test/install/paths.test.ts`
- `test/install/verify-layers.test.ts`

**Estimated scope:** Medium

## Checkpoint: After Tasks 7-9

- [x] MiMoCode detection and path resolution are fixture-backed.
- [x] Global and project config targets match MiMoCode, not OpenCode.
- [x] `MIMOCODE_HOME`, project discovery, and disabled-project behavior have
      explicit test coverage.
- [x] Future command: `rtk npm run test`.

**Checkpoint evidence:** `rtk npm run typecheck` and `rtk npm run test` passed
after T007-T009 changes.

## Phase 4: Safe secret intake and managed storage

### Task 10: Implement safe secret intake

**Description:** Add the allowed secret intake paths and reject unsafe command
line secret input before any install flow starts.

**Acceptance criteria:**

- [x] Hidden prompt works only when stdin and stdout are TTYs.
- [x] `GONKAGATE_API_KEY` is accepted as setup input but not treated as the
      durable runtime contract.
- [x] `--api-key-stdin` reads from stdin and trims surrounding whitespace.
- [x] Plain `--api-key` and `--api-key=<value>` are rejected with redacted,
      actionable guidance.

**Verification:**

- [x] Focused tests cover prompt, env, stdin, empty input, non-interactive
      failures, and plain-flag rejection.
- [x] Secret redaction tests cover stdout, stderr, thrown errors, and JSON.
- [x] Future command: `rtk npm run test`.

**Evidence:** Added `src/install/secrets.ts`, expanded CLI parser rejection, and
focused tests for env/stdin/prompt/non-interactive/invalid paths with redaction.
Fresh checks passed: `rtk npm run typecheck`; `rtk npm run test` (41 tests).

**Dependencies:** Task 6

**Files likely touched:**

- `src/install/secrets.ts`
- `src/cli/parse.ts`
- `src/install/redact.ts`
- `test/install/secrets.test.ts`
- `test/cli.test.ts`

**Estimated scope:** Medium

### Task 11: Implement managed secret file storage

**Description:** Store the GonkaGate API key under
`~/.gonkagate/mimo-code/api-key`, protect it with owner-only permissions where
POSIX modes are supported, and keep native Windows files inside the current
user profile without claiming portable chmod behavior.

**Acceptance criteria:**

- [x] Secret writes never target repository-local files.
- [x] POSIX and WSL secret directory and file modes are owner-only where
      supported.
- [x] Native Windows validates profile-scoped managed paths and documents ACL
      inheritance semantics.
- [x] Reruns repair drifted POSIX permissions in place when contents already
      match, without rewriting the secret or creating a backup.

**Verification:**

- [x] Focused storage tests cover new file, changed file, unchanged file,
      permission repair, Windows profile checks, and path rejection.
- [x] Future command: `rtk npm run test`.

**Evidence:** Added managed path helpers and `writeManagedSecret`/verification
logic with POSIX mode repair and Windows profile guards. Fresh checks passed:
`rtk npm run typecheck`; `rtk npm run test` (41 tests).

**Dependencies:** Tasks 5, 10

**Files likely touched:**

- `src/install/managed-files.ts`
- `src/install/storage.ts`
- `src/install/platform-path.ts`
- `test/install/storage.test.ts`

**Estimated scope:** Medium

### Task 12: Implement managed install-state persistence

**Description:** Write `~/.gonkagate/mimo-code/install-state.json` as the
durable migration and rerun anchor for selected model, scope, provider package,
transport, MiMoCode version, config targets, previous installer-owned model
ref, and `lastDurableSetupAt`.

**Acceptance criteria:**

- [x] State schema records installer version, audited MiMoCode baseline,
      installed MiMoCode version, selected model key, selected scope,
      transport, provider package, global target, optional project target,
      previous managed model ref, and `lastDurableSetupAt`.
- [x] Reading old or partial state fails safely or migrates through explicit
      compatibility rules.
- [x] `lastDurableSetupAt` advances only after durable verification succeeds.

**Verification:**

- [x] Focused tests cover serialize, parse, invalid state, old state, rerun
      ownership, and Windows profile scoping.
- [x] Future command: `rtk npm run test`.

**Evidence:** Added install-state schema, parser, reader, and writer. State
creation requires caller-supplied `lastDurableSetupAt`, keeping timestamp
advancement outside pre-verification writes. Fresh checks passed: `rtk npm run
typecheck`; `rtk npm run test` (41 tests).

**Dependencies:** Task 11

**Files likely touched:**

- `src/install/state.ts`
- `src/install/contracts/install-state.ts`
- `test/install/state.test.ts`

**Estimated scope:** Medium

## Checkpoint: After Tasks 10-12

- [x] Secret intake is safe and tested.
- [x] Managed storage never writes secrets into a repository.
- [x] Install state can support rerun and future migration behavior.
- [x] Future command: `rtk npm run test`.

**Checkpoint evidence:** `rtk npm run typecheck` and `rtk npm run test` passed
after T010-T012 changes.

## Phase 5: Config parse/merge/write/backup implementation

### Task 13: Implement safe JSON/JSONC config parsing and mutation helpers

**Description:** Add JSON/JSONC parsing and structured edit helpers that
preserve unrelated MiMoCode config, EOL style, trailing newline behavior, and
safe failure semantics.

**Acceptance criteria:**

- [x] Existing JSON and JSONC files parse through a shared helper.
- [x] Parse failures stop before writes and include redacted file/path
      diagnostics.
- [x] Structured edits use parser APIs rather than ad hoc string mutation.
- [x] The helper adds `$schema` only when the target document needs managed
      writes and the schema rule remains compatible with MiMoCode.

**Verification:**

- [x] Focused tests cover empty files, JSON, JSONC comments, invalid syntax,
      EOL preservation, trailing newline, and unrelated key preservation.
- [x] Future command: `rtk npm run test`.

**Evidence:** Added shared JSONC parse/edit helpers using `jsonc-parser`,
managed config value application, schema insertion on managed writes, and
focused preservation/error tests. Fresh checks passed: `rtk npm run typecheck`;
`rtk npm run test` (51 tests).

**Dependencies:** Tasks 4, 8

**Files likely touched:**

- `src/install/jsonc.ts`
- `src/install/config.ts`
- `src/install/config-value.ts`
- `test/install/config.test.ts`

**Estimated scope:** Medium

### Task 14: Generate managed GonkaGate provider and model catalog config

**Description:** Translate MiMoCode-validated curated registry entries into the
managed `provider.gonkagate` config shape, including provider package, base
URL, secret binding, `setCacheKey`, model entries, limits, and compatibility
metadata.

**Acceptance criteria:**

- [x] Provider config uses `@ai-sdk/openai-compatible`.
- [x] Provider options include canonical `baseURL` and
      `{file:~/.gonkagate/mimo-code/api-key}`.
- [x] Every validated model is written under
      `provider.gonkagate.models`.
- [x] Candidate models are not exposed in generated runtime config.
- [x] Compatibility metadata cannot override canonical secret binding or base
      URL.

**Verification:**

- [x] Focused tests cover empty validated registry, candidate-only registry,
      one validated model, multiple validated models, provider option merging,
      and invalid overrides.
- [x] Future command: `rtk npm run test`.

**Evidence:** Added `src/install/managed-provider-config.ts` and focused tests
for empty/candidate/validated registries, canonical provider options, model
metadata, and invalid canonical overrides. Fresh checks passed: `rtk npm run
typecheck`; `rtk npm run test` (51 tests).

**Dependencies:** Task 13

**Files likely touched:**

- `src/install/managed-provider-config.ts`
- `src/constants/models.ts`
- `test/install/managed-provider-config.test.ts`
- `test/install/models.test.ts`

**Estimated scope:** Medium

### Task 15: Implement atomic managed writes, backups, and rollback

**Description:** Add managed write helpers for global config, project config,
secret file, and install-state file with no-op detection, timestamped backups,
project backup relocation, atomic replacement, and rollback actions.

**Acceptance criteria:**

- [x] Existing managed user files are backed up before replacement.
- [x] Project config backups are stored under
      `~/.gonkagate/mimo-code/backups/project-config`, not beside the project
      file.
- [x] No-op writes do not create backups.
- [x] If later verification fails, changed managed files roll back through the
      recorded transaction.

**Verification:**

- [x] Focused tests cover create, replace, no-op, backup naming, project backup
      hash naming, rollback restore, rollback delete-created-file, and rollback
      failure reporting.
- [x] Future command: `rtk npm run test`.

**Evidence:** Added rollback actions, managed atomic write helper, and
transaction wrapper with focused create/replace/no-op/project-backup/rollback
tests. Fresh checks passed: `rtk npm run typecheck`; `rtk npm run test` (51
tests).

**Dependencies:** Tasks 11, 13

**Files likely touched:**

- `src/install/managed-files.ts`
- `src/install/write.ts`
- `src/install/rollback.ts`
- `src/install/managed-write-transaction.ts`
- `test/install/write.test.ts`
- `test/install/rollback.test.ts`

**Estimated scope:** Medium

## Checkpoint: After Tasks 13-15

- [x] Config edits are structured and preserve unrelated MiMoCode settings.
- [x] Backups and rollback are tested before scope-specific writes use them.
- [x] Candidate models still cannot become public runtime choices accidentally.
- [x] Future command: `rtk npm run test`.

**Checkpoint evidence:** `rtk npm run typecheck` and `rtk npm run test` passed
after T013-T015 changes.

## Phase 6: Scope normalization and ownership

### Task 16: Implement data-driven user and project scope write plans

**Description:** Encode the v1 ownership model as explicit write plans: user
scope writes provider, secret binding, `model`, and `small_model` to global
config; project scope writes provider and secret binding to global config and
only activation settings to `.mimocode/mimocode.json`.

**Acceptance criteria:**

- [x] User scope writes all managed provider and activation settings to the
      resolved global config target.
- [x] Project scope writes provider and secret binding only to the global
      target.
- [x] Project scope writes only `model` and `small_model` to
      `.mimocode/mimocode.json`.
- [x] Scope write plans are data-driven enough to test ownership without
      running the full installer.

**Verification:**

- [x] Focused tests cover user scope, project scope, existing unrelated config,
      and candidate/validated model boundaries.
- [x] Future command: `rtk npm run test`.

**Evidence:** Added data-driven scope write plans and render helpers, with
focused tests proving user/project ownership and candidate-only catalog
exclusion. Fresh checks passed: `rtk npm run typecheck`; `rtk npm run test` (58
tests).

**Dependencies:** Tasks 14-15

**Files likely touched:**

- `src/install/contracts/managed-config.ts`
- `src/install/scope.ts`
- `src/install/write-target-config.ts`
- `test/install/scope.test.ts`

**Estimated scope:** Medium

### Task 17: Implement installer-owned stale activation cleanup

**Description:** On rerun or scope change, remove only installer-owned stale
GonkaGate `model` and `small_model` activation from the old target, using the
current validated model ref, previous install-state model ref, and curated
registry ownership rules.

**Acceptance criteria:**

- [x] Moving from user scope to project scope removes only owned activation
      from global config.
- [x] Moving from project scope to user scope removes only owned activation
      from the project config.
- [x] Non-owned `model` or `small_model` values are preserved and later
      surfaced by verification if they still block the intended outcome.
- [x] Cleanup does not delete unrelated provider, agent, plugin, MCP, memory,
      permissions, formatter, UI, or tool settings.

**Verification:**

- [x] Focused rerun tests cover scope change, previous model key, non-owned
      activation, and missing install-state.
- [x] Future command: `rtk npm run test`.

**Evidence:** Added conservative installer-owned activation cleanup based on
current model refs, previous install state, and curated registry ownership.
Fresh checks passed: `rtk npm run typecheck`; `rtk npm run test` (58 tests).

**Dependencies:** Tasks 12, 16

**Files likely touched:**

- `src/install/managed-config-mutations.ts`
- `src/install/scope.ts`
- `src/install/state.ts`
- `test/install/rerun.test.ts`
- `test/install/managed-config-mutations.test.ts`

**Estimated scope:** Medium

### Task 18: Enforce project config commit-safety

**Description:** Add explicit guards and tests proving project config never
contains raw secrets, the managed secret path, `provider.gonkagate.options.apiKey`,
or MiMoCode auth storage data.

**Acceptance criteria:**

- [x] Project-scope writes refuse to add provider definitions or secret
      bindings to `.mimocode/mimocode.json`.
- [x] Verification blocks success when project config already defines
      `provider.gonkagate.options.apiKey`.
- [x] Diagnostics explain the project-scope ownership violation without
      printing secret material.

**Verification:**

- [x] Focused tests cover generated project config, malicious preexisting
      project config, project config with raw `gp-...`, and project config with
      the managed file reference.
- [x] Future command: `rtk npm run test`.

**Evidence:** Added project commit-safety checks and verification blockers for
forbidden project provider secret binding, managed secret path, raw key, and
auth data. Fresh checks passed: `rtk npm run typecheck`; `rtk npm run test` (58
tests).

**Dependencies:** Tasks 16-17

**Files likely touched:**

- `src/install/verify-layers.ts`
- `src/install/verification-blockers.ts`
- `src/install/scope.ts`
- `test/install/scope.test.ts`
- `test/install/verify-layers.test.ts`

**Estimated scope:** Medium

## Checkpoint: After Tasks 16-18

- [x] User and project ownership are encoded in tests, not only docs.
- [x] Project config remains commit-safe by default.
- [x] Rerun cleanup is conservative and ownership-aware.
- [x] Future command: `rtk npm run test`.

**Checkpoint evidence:** `rtk npm run typecheck` and `rtk npm run test` passed
after T016-T018 changes.

## Phase 7: Effective config and secret provenance verification

### Task 19: Verify managed secret and raw config provenance

**Description:** Prove the managed secret file exists, contains the intended
key without printing it, has supported platform protections, and is referenced
from raw global config through the canonical file binding.

**Acceptance criteria:**

- [x] Secret file existence and contents are verified without logging the key.
- [x] POSIX permissions are verified where supported.
- [x] Raw global config must own
      `provider.gonkagate.options.apiKey` with the canonical file binding.
- [x] Durable layers other than user/global config must not own the secret
      binding.

**Verification:**

- [x] Focused tests cover correct binding, missing binding, wrong binding,
      secret mismatch, permission mismatch, higher-precedence secret binding,
      and redacted diagnostics.
- [x] Future command: `rtk npm run test`.

**Evidence:** Added secret provenance verification for managed secret contents,
POSIX mode, canonical global binding, and project-layer secret ownership
violations. Fresh checks passed: `rtk npm run typecheck`; `rtk npm run test`
(67 tests).

**Dependencies:** Tasks 11, 16, 18

**Files likely touched:**

- `src/install/verify-provenance.ts`
- `src/install/verify-layers.ts`
- `src/install/verification-blockers.ts`
- `test/install/verify-provenance.test.ts`

**Estimated scope:** Medium

### Task 20: Verify durable resolved config with `mimo --pure debug config`

**Description:** Capture `mimo --pure debug config` internally, treat it as
secret-bearing and possibly normalizing, parse it as structured config, redact
diagnostics, and compare the durable plain-`mimo` result against the intended
GonkaGate setup.

**Acceptance criteria:**

- [x] Raw `mimo --pure debug config` stdout/stderr is never printed.
- [x] The command is treated as verification proof that may trigger upstream
      schema normalization, not as a guaranteed no-write operation.
- [x] User-facing diagnostics and troubleshooting docs never ask users to paste
      raw `mimo --pure debug config` output.
- [x] Durable verification runs with a controlled environment that removes
      runtime-only override layers such as `MIMOCODE_CONFIG_CONTENT`.
- [x] Resolved config must include selected `model`, selected `small_model`,
      `provider.gonkagate`, provider package, base URL, current transport shape,
      and validated model catalog entries.
- [x] Command failures and parse failures produce redacted typed errors.

**Verification:**

- [x] Focused tests cover matching config, wrong model, wrong `small_model`,
      missing provider, wrong package, wrong base URL, wrong transport,
      malformed debug output, command failure, and secret-bearing output.
- [x] Future command: `rtk npm run test`.

**Evidence:** Added durable/current effective config verification that captures
raw debug output internally, strips runtime-only overrides for durable proof,
parses structured config, and emits redacted mismatch blockers. Fresh checks
passed: `rtk npm run typecheck`; `rtk npm run test` (67 tests).

**Dependencies:** Tasks 14, 19

**Files likely touched:**

- `src/install/verify-effective.ts`
- `src/install/effective-config-policy.ts`
- `src/install/verification-mismatches.ts`
- `src/install/redact.ts`
- `test/install/verify-effective.test.ts`

**Estimated scope:** Medium

## Checkpoint: After Tasks 19-20

- [x] Durable secret provenance is checked separately from redacted resolved
      config.
- [x] `mimo --pure debug config` is used as proof without leaking raw output.
- [x] Effective config mismatch diagnostics are typed and redacted.
- [x] Future command: `rtk npm run test`.

**Checkpoint evidence:** `rtk npm run typecheck` and `rtk npm run test` passed
after T019-T020 changes.

### Task 21: Verify provider/model visibility and gating blockers

**Description:** Add `mimo models gonkagate` verification and blocker
classification for provider allow/deny lists, provider whitelist/blacklist,
selected model whitelist/blacklist, and locally inspectable layer conflicts.

**Acceptance criteria:**

- [x] `mimo models gonkagate` proves provider/model visibility but does not
      replace base URL/options verification.
- [x] `enabled_providers` excluding `gonkagate` blocks success.
- [x] `disabled_providers` including `gonkagate` blocks success.
- [x] `provider.gonkagate.whitelist` excluding the selected model blocks
      success.
- [x] `provider.gonkagate.blacklist` including the selected model blocks
      success.
- [x] If resolved config proves a blocker but no inspectable layer explains it,
      the result reports an inferred remote, managed, or higher-precedence
      blocker.

**Verification:**

- [x] Focused tests cover provider-listing success/failure, allow/deny,
      whitelist/blacklist, inspectable attribution, and inferred blockers.
- [x] Future command: `rtk npm run test`.

**Evidence:** Added model visibility verification, provider allow/deny and
model whitelist/blacklist blockers, and inferred provider blocker helper. Fresh
checks passed: `rtk npm run typecheck`; `rtk npm run test` (67 tests).

**Dependencies:** Task 20

**Files likely touched:**

- `src/install/verify-models.ts`
- `src/install/verification-blockers.ts`
- `src/install/verify-layers.ts`
- `test/install/verify-models.test.ts`
- `test/install/verify-layers.test.ts`

**Estimated scope:** Medium

### Task 22: Verify current-session override behavior

**Description:** Verify the current invoking shell separately from durable
plain-`mimo` behavior when `MIMOCODE_CONFIG`, `MIMOCODE_CONFIG_CONTENT`,
`MIMOCODE_CONFIG_DIR`, `MIMOCODE_AUTH_CONTENT`, or
`MIMOCODE_DISABLE_PROJECT_CONFIG` can change the effective result.

**Acceptance criteria:**

- [x] `MIMOCODE_CONFIG` is treated as an override layer loaded after global
      config and before project/local config, not as the durable global target.
- [x] `MIMOCODE_CONFIG_CONTENT` is runtime-only and never a durable install
      target.
- [x] `MIMOCODE_AUTH_CONTENT` is reported when it can affect secret/provider
      resolution.
- [x] `MIMOCODE_CONFIG_DIR` conflicts are inspected where locally observable,
      including when project config discovery is disabled.
- [x] Project scope reports a blocker when `MIMOCODE_DISABLE_PROJECT_CONFIG`
      disables the project activation target.
- [x] `MIMOCODE_DISABLE_PROJECT_CONFIG` is not treated as disabling
      `MIMOCODE_CONFIG_DIR`.
- [x] File-based system managed config, macOS managed preferences, remote or
      organization config, and other non-local higher-precedence sources are
      reported as attributed or inferred blockers when resolved config proves
      they changed the intended result.
- [x] Current-session success is not required to advance `lastDurableSetupAt`
      after durable verification succeeded, but current-session blockers must
      be reported clearly.

**Verification:**

- [x] Focused tests cover each `MIMOCODE_*` variable, durable-vs-current
      split, identical non-secret override, secret-binding override, and
      current-session blocked result.
- [x] Future command: `rtk npm run test`.

**Evidence:** Added current-session override blocker classification and tests
covering `MIMOCODE_CONFIG`, `MIMOCODE_CONFIG_CONTENT`,
`MIMOCODE_CONFIG_DIR`, `MIMOCODE_AUTH_CONTENT`, and
`MIMOCODE_DISABLE_PROJECT_CONFIG`, including durable/current split behavior.
Fresh checks passed: `rtk npm run typecheck`; `rtk npm run test` (67 tests).

**Dependencies:** Tasks 20-21

**Files likely touched:**

- `src/install/verify-effective.ts`
- `src/install/verify-layers.ts`
- `src/install/context.ts`
- `test/install/verify-effective.test.ts`
- `test/install/verify-layers.test.ts`

**Estimated scope:** Medium

## Checkpoint: After Tasks 21-22

- [x] Provider/model visibility is verified separately from config shape.
- [x] All required MiMoCode override variables have explicit behavior.
- [x] Durable and current-session verification are separately reported.
- [x] Future command: `rtk npm run test`.

**Checkpoint evidence:** `rtk npm run typecheck` and `rtk npm run test` passed
after T021-T022 changes.

## Phase 8: CLI UX, JSON output, rerun behavior

### Task 23: Implement end-to-end installer orchestration

**Description:** Wire the installer flow from CLI request through context
resolution, model selection, scope selection, secret intake, managed writes,
durable verification, install-state persistence, current-session verification,
and final result rendering.

**Acceptance criteria:**

- [x] The runtime writes nothing until model, scope, context, and secret input
      are valid.
- [x] Managed writes are executed through rollback-aware transactions.
- [x] Durable verification runs before install-state persistence.
- [x] Current-session verification runs after durable verification and state
      persistence.
- [x] The CLI still returns nonzero for `blocked` and `failed` outcomes.

**Verification:**

- [x] End-to-end fake-`mimo` tests cover success, durable failure with rollback,
      current-session block after durable success, and unexpected failure.
- [x] Future command: `rtk npm run test`.

**Evidence:** Added `runInstallSession` orchestration and wired `runInstaller`
to it. Fake-`mimo` session tests cover user/project success, durable failure
rollback, current-session block after durable success, and unexpected failure
through CLI JSON. Fresh checks passed: `rtk npm run typecheck`; `rtk npm run
test` (77 tests).

**Dependencies:** Tasks 7-22

**Files likely touched:**

- `src/install/index.ts`
- `src/install/session.ts`
- `src/cli/execute.ts`
- `test/install/rerun.test.ts`
- `test/cli.test.ts`

**Estimated scope:** Medium

### Task 24: Implement human CLI UX and safe non-interactive behavior

**Description:** Add the production user-facing CLI flags, prompts, defaults,
and human-readable output while keeping setup simpler than native custom
provider configuration.

**Acceptance criteria:**

- [x] CLI supports `--model`, `--scope`, `--cwd`, `--api-key-stdin`, `--yes`,
      `--json`, help, and version.
- [x] Interactive mode shows the public curated picker only when validated
      MiMoCode models exist.
- [x] Non-interactive `--yes` may select recommended defaults only when model
      and scope are unambiguous and safe.
- [x] Success output ends with `Next: mimo`.
- [x] Help text lists safe secret inputs and never suggests plain `--api-key`.

**Verification:**

- [x] CLI tests cover help, version, flags, prompt flow, non-interactive
      requirements, `--yes`, no validated models, and redacted failures.
- [x] Future command: `rtk npm run test`.

**Evidence:** CLI parse/execute/render now drives installer runtime. Tests cover
help/version, default candidate-only blocked path, JSON success, human success
ending in `Next: mimo`, unsafe `--api-key` rejection, validated model selection,
non-interactive defaults, and redacted failed JSON. Fresh checks passed: `rtk
npm run typecheck`; `rtk npm run test` (77 tests).

**Dependencies:** Tasks 10, 23, 26

**Files likely touched:**

- `src/cli/parse.ts`
- `src/cli/render.ts`
- `src/install/selection.ts`
- `test/cli.test.ts`
- `test/install/selection.test.ts`

**Estimated scope:** Medium

### Task 25: Implement structured JSON output and rerun idempotence

**Description:** Make `--json` emit stable machine-readable results for
success, blocked, failed, and unexpected errors, and verify reruns are
idempotent when inputs and effective config already match.

**Acceptance criteria:**

- [x] JSON output contains `ok`, `status`, `errorCode` when applicable, model,
      scope, config targets, MiMoCode version, verification summaries, and
      blockers without secrets.
- [x] Rerun with unchanged secret/config avoids unnecessary backups.
- [x] Rerun with changed secret or selected model creates the expected backups
      and state update.
- [x] JSON and human renderers agree on outcome semantics.

**Verification:**

- [x] Focused tests cover JSON success, JSON blocked, JSON failed, unexpected
      error, unchanged rerun, changed rerun, and no secret leakage.
- [x] Future command: `rtk npm run test`.

**Evidence:** Added structured installer JSON rendering, human rendering, and
rerun tests proving unchanged reruns avoid backups while changed selected model
creates managed config backups. Fresh checks passed: `rtk npm run typecheck`;
`rtk npm run test` (77 tests).

**Dependencies:** Tasks 12, 15, 23

**Files likely touched:**

- `src/cli/render.ts`
- `src/install/session.ts`
- `src/install/state.ts`
- `test/cli.test.ts`
- `test/install/rerun.test.ts`

**Estimated scope:** Medium

## Checkpoint: After Tasks 23-25

- [x] A fake-`mimo` end-to-end install can succeed or fail with correct
      rollback and redacted output.
- [x] CLI human and JSON output are both stable.
- [x] Reruns are idempotent and ownership-aware.
- [x] Future command: `rtk npm run test`.

**Checkpoint evidence:** `rtk npm run typecheck` and `rtk npm run test` passed
after T023-T025 changes.

## Phase 9: Model registry validation and picker behavior

### Task 26: Formalize MiMoCode model validation records

**Description:** Add the implementation-facing validation record format and
proof checklist for promoting candidate GonkaGate models to
MiMoCode-validated runtime models.

**Acceptance criteria:**

- [x] A model cannot be marked `validated` without a validation record.
- [x] The record covers MiMoCode TUI startup, `mimo run`, streaming text,
      tool calling, file edit loops, multi-turn continuation, `small_model`,
      model switching, user scope, project scope, `mimo --pure debug config`,
      `mimo models gonkagate`, and config-layer precedence.
- [x] The record captures required provider options, model options, headers,
      limits, transport, package, and migration metadata.
- [x] Live GonkaGate session proof remains a gated validation activity, not a
      normal CI requirement.

**Verification:**

- [x] Contract tests reject validated registry entries without a matching
      validation record.
- [x] Manual review confirms no candidate model is exposed as public runtime
      behavior without proof.
- [x] Future command: `rtk npm run test`.

**Evidence:** Added `src/constants/model-validation.ts`, expanded
`docs/model-validation.md`, and contract tests requiring validation records for
any validated registry entry. Default registry remains candidate-only. Fresh
checks passed: `rtk npm run typecheck`; `rtk npm run test` (77 tests).

**Dependencies:** Task 14

**Files likely touched:**

- `docs/model-validation.md`
- `docs/model-validation/*.md`
- `src/constants/models.ts`
- `test/package-contract.test.ts`
- `test/docs-contract.test.ts`

**Estimated scope:** Medium

### Task 27: Implement validated-only picker and no-validated-model behavior

**Description:** Make model selection expose only MiMoCode-validated entries,
handle the current candidate-only registry safely, and support recommended
defaults once a validated model exists.

**Acceptance criteria:**

- [x] Candidate-only registry produces a clear `validated_models_unavailable`
      blocked or failed result without claiming setup success.
- [x] Interactive picker lists only validated models.
- [x] `--model` accepts only validated model keys.
- [x] `--yes` auto-selects only a recommended validated model or a single
      unambiguous validated model.
- [x] Every selected model writes both `model` and `small_model` to the same
      v1 ref.

**Verification:**

- [x] Focused tests cover candidate-only registry, unsupported key, one
      validated model, multiple validated models, recommended model, picker
      labels, and non-interactive ambiguity.
- [x] Future command: `rtk npm run test`.

**Evidence:** Added validated-only selection and scope selection. Tests cover
candidate-only public block, unsupported keys, recommended/single/multiple
validated models, prompt-backed picker path, and non-interactive ambiguity.
Fresh checks passed: `rtk npm run typecheck`; `rtk npm run test` (77 tests).

**Dependencies:** Tasks 24, 26

**Files likely touched:**

- `src/install/selection.ts`
- `src/constants/models.ts`
- `src/install/managed-provider-config.ts`
- `test/install/selection.test.ts`
- `test/install/models.test.ts`

**Estimated scope:** Medium

### Task 28: Promote the first public MiMoCode model only after gated proof

**Description:** After the validation record exists and the gated proof is
reviewed, mark the first MiMoCode model as validated, choose the recommended
default, and update docs/tests to expose the public picker truth.

**Acceptance criteria:**

- [x] At least one model has a completed MiMoCode validation record.
- [x] Registry metadata matches the proof exactly.
- [x] Public docs name the model as validated only after proof exists.
- [x] Tests prove the model appears in the picker and provider catalog.
- [x] Any live GonkaGate validation uses explicit credentials and is not part
      of default CI.

**Verification:**

- [x] Gated manual validation command set is recorded in the model validation
      record.
- [x] Focused registry, picker, docs, and provider-catalog tests pass.
- [x] Future command: `rtk npm run test`.

**Evidence:** The public GonkaGate models page was reviewed on 2026-06-11 and
candidate registry metadata was refreshed for `moonshotai/kimi-k2.6`,
`minimaxai/minimax-m2.7`, and
`qwen/qwen3-235b-a22b-instruct-2507-fp8`, including published context lengths.
Gated live validation then used a locally stored test GonkaGate key and
isolated MiMoCode `HOME`/XDG roots. npm `latest` for `@mimo-ai/cli` was
`0.1.0`, matching the audited baseline. Pre-promotion diagnostics proved two
contract issues: short `gonkagate/kimi-k2.6` sends upstream
`model_slug: "kimi-k2.6"` and fails with `model_not_found`, and
`setCacheKey: true` emits `promptCacheKey`, which GonkaGate rejects. After the
approved contract update to full-slug model keys and `setCacheKey: false`,
`scripts/live-mimocode-validation.mjs` passed: user-scope and project-scope
installer verification both returned `success` with durable/current/provenance/
model-visibility checks passed; `mimo run --pure --format json` from project
config and explicit `--model gonkagate/moonshotai/kimi-k2.6` returned
`step_start`, `text`, and `step_finish` events with no error events; the
file-edit run emitted `tool_use` and created the expected file; multi-turn
continuation returned text events; TUI startup smoke stayed running until the
controlled timeout with no stderr. Fresh checks passed: `rtk npm run
typecheck`; `rtk npm run test` (78 tests).

**Dependencies:** Tasks 26-27

**Files likely touched:**

- `src/constants/models.ts`
- `docs/model-validation.md`
- `docs/model-validation/*.md`
- `test/install/models.test.ts`
- `test/package-contract.test.ts`
- `test/docs-contract.test.ts`

**Estimated scope:** Medium

## Checkpoint: After Tasks 26-28

- [x] Public model exposure is proof-gated.
- [x] Candidate models cannot leak into runtime setup.
- [x] The picker behaves correctly with zero, one, or multiple validated
      models.
- [x] Future command: `rtk npm run test`.

**Checkpoint evidence:** `moonshotai/kimi-k2.6` is the only public validated
model, candidate entries remain excluded from runtime provider catalog entries,
selection tests cover zero/one/multiple validated-model cases, and
`rtk npm run test` passed with 78 tests after the promotion.

## Phase 10: Cross-platform proof, docs, CI, release readiness

### Task 29: Add cross-platform fake-`mimo` integration proof

**Description:** Expand hermetic integration coverage for macOS/POSIX
semantics, Linux, WSL detection, native Windows paths, Windows command shims,
and CI-backed fake-`mimo` execution.

**Acceptance criteria:**

- [ ] Ubuntu CI exercises the fake-`mimo` integration path.
- [ ] Windows CI exercises native Windows path and command-shim behavior.
- [ ] WSL detection and path handling are fixture-backed.
- [ ] Native Windows support is not claimed beyond what CI and integration
      proof cover.

**Verification:**

- [ ] Focused tests cover POSIX, WSL, native Windows, Git Bash style paths,
      `.cmd` shim resolution, and fake-`mimo` spawn behavior.
- [ ] Future command: `rtk npm run ci` on Ubuntu and Windows CI.

**Partial evidence:** Strengthened fake-`mimo` harness to generate a real
Windows `.cmd` shim, added executor-backed fake-`mimo` spawn coverage, and
added Git Bash Windows path normalization tests. Fresh local checks passed:
`rtk npm run typecheck`; `rtk npm run test` (78 tests); later full
`rtk npm run ci` passed after the validated Kimi promotion. The checked-in CI
workflow has an `ubuntu-latest` and `windows-latest` matrix, but the GitHub
repository is currently empty and no remote Actions run exists for this
worktree. `gh` and `act` are not installed locally. Remaining proof gap: actual
Ubuntu and native Windows CI evidence is still required before T029 can be
marked complete.

**Dependencies:** Tasks 5, 7-9, 23

**Files likely touched:**

- `src/install/platform-path.ts`
- `src/install/deps.ts`
- `src/install/context.ts`
- `test/install/deps.test.ts`
- `test/install/context.test.ts`
- `.github/workflows/ci.yml`

**Estimated scope:** Medium

### Task 30: Add packaging and installed-bin smoke checks

**Description:** Verify the published package shape by packing or installing
the built package into an isolated temp project and running the bin against the
fake-`mimo` harness.

**Acceptance criteria:**

- [ ] Package exports include only intended runtime files, docs, README,
      CHANGELOG, and LICENSE.
- [ ] Both `mimo-code-setup` and legacy `gonkagate-mimo-code` bin names invoke
      the same production runtime.
- [ ] Packed-bin smoke does not require real credentials or network.
- [ ] Publish workflow still runs `npm run ci` before OIDC publish.

**Verification:**

- [ ] Focused package smoke test passes locally.
- [ ] Future command: `rtk npm run package:check`.
- [ ] Future command: `rtk npm run ci`.

**Partial evidence:** Added `scripts/package-smoke.mjs` and wired
`package:check` to `npm run build && publint && npm run package:smoke`.
Fresh local checks passed: `rtk npm run package:check`,
`rtk npm run typecheck`, and `rtk npm run test` (78 tests). After the validated
Kimi promotion, package smoke was updated to exercise the packaged production
bins through fake `mimo --version` and `mimo debug paths` until the safe
non-interactive secret gate; fresh `rtk npm run package:check` and
`rtk npm run ci` passed. T030 remains unchecked because it depends on T029,
whose Ubuntu/Windows CI proof is still missing.

**Dependencies:** Tasks 23-25, 29

**Files likely touched:**

- `package.json`
- `bin/gonkagate-mimo-code.js`
- `test/package-contract.test.ts`
- `test/package-smoke.test.ts`
- `.github/workflows/publish.yml`

**Estimated scope:** Medium

### Task 31: Flip public docs and scaffold contracts to shipped runtime truth

**Description:** After runtime implementation and proof are in place, update
public docs, AGENTS, changelog, and contract tests from scaffold truth to
shipped runtime truth.

**Acceptance criteria:**

- [ ] README describes the implemented flow and no longer says the runtime is
      `not_implemented`.
- [ ] AGENTS truth matches shipped behavior, supported platforms, model
      validation status, and MiMoCode baseline.
- [ ] `docs/how-it-works.md`, `docs/security.md`,
      `docs/troubleshooting.md`, and `docs/model-validation.md` match runtime
      behavior.
- [ ] `CHANGELOG.md` records the meaningful user-facing change.
- [ ] Tests no longer assert scaffold-only behavior once runtime success is
      real.

**Verification:**

- [ ] Contract tests prove docs, package metadata, constants, CLI output, and
      model registry truth agree.
- [ ] Future command: `rtk npm run ci`.

**Partial evidence:** Public truth has been flipped from scaffold/candidate-only
to shipped runtime with `moonshotai/kimi-k2.6` validated and recommended,
full-slug model keys, and `setCacheKey: false`. Updated AGENTS, README,
CHANGELOG, PRD, how-it-works, security, troubleshooting, model-validation docs,
runtime constants, CLI tests, package contract tests, and docs contract tests.
Fresh `rtk npm run ci` passed locally. T031 remains unchecked because it depends
on T029-T030 and the required remote Ubuntu/Windows CI proof is still missing.

**Dependencies:** Tasks 23-30

**Files likely touched:**

- `AGENTS.md`
- `README.md`
- `CHANGELOG.md`
- `docs/how-it-works.md`
- `docs/security.md`
- `docs/troubleshooting.md`
- `docs/model-validation.md`
- `test/docs-contract.test.ts`
- `test/package-contract.test.ts`
- `test/cli.test.ts`

**Estimated scope:** Medium

## Checkpoint: After Tasks 29-31

- [ ] Cross-platform claims are backed by tests or CI.
- [ ] Package smoke covers installed-bin behavior.
- [ ] Public docs and contract tests describe the same shipped runtime.
- [ ] Future command: `rtk npm run ci`.

## Final Readiness Gate

- [x] `rtk npm run ci` passes locally.
- [ ] Ubuntu and native Windows CI pass with the fake-`mimo` integration path.
- [x] Focused fake-`mimo` smoke covers user scope, project scope, rerun
      idempotence, rollback after failed verification, durable success plus
      current-session block, JSON output, and redaction.
- [x] Package smoke verifies the packed bin names in an isolated temp project.
- [x] Model validation records exist for every public validated model.
- [x] No default CI path requires real GonkaGate credentials or live network
      access.
- [x] Any optional live GonkaGate session validation is explicitly gated,
      credential-scoped, redacted, and recorded separately from default release
      readiness.
- [x] `AGENTS.md`, `README.md`, docs, constants, tests, package metadata, and
      changelog all agree on the same implementation status.
- [x] Raw `mimo --pure debug config` output is never printed, stored in logs,
      requested from users, or included in test snapshots.
- [x] Project-scope config remains commit-safe and contains no raw key, no
      managed secret path, and no `provider.gonkagate.options.apiKey`.

**Final gate evidence:** Local `rtk npm run ci` passed after the validated Kimi
promotion. `scripts/live-mimocode-validation.mjs` is a separate gated live
validation helper and is not part of default CI. The remaining final gate gap is
remote GitHub Actions evidence for the Ubuntu and native Windows matrix.
