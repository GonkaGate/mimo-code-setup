@/Users/daniil/.codex/RTK.md

--- project-doc ---

# AGENTS.md

## What This Repository Is

`mimo-code-setup` is the public open-source onboarding repository for a future
GonkaGate CLI that configures local MiMoCode to use GonkaGate as a custom
provider without requiring users to hand-edit MiMoCode config, export secrets
through shell profiles, or understand MiMoCode provider internals.

Planned public flow:

```bash
npx @gonkagate/mimo-code-setup
```

Current honest state:

- the product PRD exists at `docs/specs/mimo-code-setup-prd/spec.md`
- package metadata, TypeScript build, CI workflows, release scaffolding,
  mirrored skills, and contract tests are present
- the latest compatibility audit found no hard blocker in official MiMoCode
  `@mimo-ai/cli` `0.1.0` for the planned `provider.gonkagate` shape, but
  runtime implementation must honor MiMoCode-specific config precedence and
  full-slug model keys
- `src/cli.ts` is a thin entrypoint over split CLI seams and now calls the
  installer runtime
- `src/install/` contains the runtime contracts, dependency adapters,
  orchestration, managed writes, rollback, redaction, and verification helpers
- the runtime collects the GonkaGate key before the model picker, calls
  `GET https://api.gonkagate.com/v1/models`, and writes every returned model
  into `provider.gonkagate.models`
- `moonshotai/kimi-k2.6` has MiMoCode validation proof for the current
  `@mimo-ai/cli` `0.1.0` baseline, but the public picker is now backed by the
  live GonkaGate model catalog rather than a hardcoded validated allowlist

If implementation status, package name, security flow, config locations,
transport contract, or verified MiMoCode baseline changes, this file must be
updated immediately so it stays truthful.

## Product Goal

The intended happy path is:

1. user runs `npx @gonkagate/mimo-code-setup`
2. installer validates local `mimo`
3. installer collects a GonkaGate `gp-...` key through a masked prompt,
   `GONKAGATE_API_KEY`, or `--api-key-stdin`
4. installer calls `GET /v1/models` with that key and offers all returned
   GonkaGate models
5. installer asks for `user` or `project` scope
6. installer writes the minimum safe MiMoCode config layers
7. installer verifies durable MiMoCode config and current-session effective
   config
8. user returns to plain `mimo`

For `project` scope, user-level config owns the provider definition and secret
binding, while repository-local MiMoCode config contains only activation
settings.

## Fixed Product Invariants

These decisions are part of the repo contract. Changing them is a product
change.

- npm package: `@gonkagate/mimo-code-setup`
- intended public npm entrypoint: `npx @gonkagate/mimo-code-setup`
- stable provider id: `gonkagate`
- canonical base URL: `https://api.gonkagate.com/v1`
- runtime model catalog source: `GET https://api.gonkagate.com/v1/models`
- current transport target: `chat_completions`
- current provider package: `@ai-sdk/openai-compatible`
- future `/v1/responses` support should be added by migration, not product
  rename
- target CLI: `mimo`
- target upstream package: `@mimo-ai/cli`
- current verified MiMoCode baseline: minimum `0.1.0`, audited on 2026-06-11
- documented global config example: `~/.config/mimocode/mimocode.json`
- actual global config target must be resolved from MiMoCode paths and existing
  `mimocode.jsonc`, `mimocode.json`, or `config.json` files; create
  `mimocode.jsonc` when no global config exists
- project config target: `.mimocode/mimocode.json`
- `MIMOCODE_CONFIG` is an override layer loaded after global config and before
  project/local config, not a replacement for the global config target
- `MIMOCODE_CONFIG_CONTENT` is a runtime-only higher-precedence override layer,
  not a durable install target
- managed user-level provider key: `provider.gonkagate`
- canonical installer-owned secret binding:
  `provider.gonkagate.options.apiKey = {file:~/.gonkagate/mimo-code/api-key}`
- canonical installer-owned cache-key setting:
  `provider.gonkagate.options.setCacheKey = false`
- project config must not own the secret binding
- public setup must fetch the model catalog after safe API-key intake instead
  of exposing a hardcoded model allowlist
- installer success must be based on effective MiMoCode config, not only file
  writes
- raw `mimo --pure debug config` output must not be printed because `{file:...}`
  substitutions may expose secrets
- `mimo --pure debug config` may trigger upstream schema normalization, so it
  is verification proof but not a guaranteed no-write command
- direct `auth.json` writes are out of scope for v1
- shell profile mutation is out of scope
- `.env` generation is out of scope
- arbitrary custom base URLs are out of scope for v1
- arbitrary custom model ids are out of scope for v1

## Security Invariants

- never print the GonkaGate `gp-...` key
- never accept secrets through plain `--api-key`
- never store the secret in repository-local files
- keep the secret under `~/.gonkagate/mimo-code/...`
- keep the canonical GonkaGate secret binding only in user config
- preserve unrelated MiMoCode config when editing user config
- create backups before replacing managed user files
- project config must stay commit-safe by default
- higher-precedence custom or managed config must be checked before reporting
  setup success

## Current Repository Truth

- `docs/specs/mimo-code-setup-prd/spec.md` is the product source of truth
- `src/cli.ts` is the public runtime entrypoint and calls `src/install/`
  through `src/cli/` parse/execute/render seams
- `src/install/` contains successful setup orchestration for safe secret
  intake, live GonkaGate model-catalog fetch, dynamic provider catalog writes,
  and effective-config verification
- `src/constants/` pins package, provider, transport, config, and
  model-validation metadata contracts
- `bin/gonkagate-mimo-code.js` is a thin wrapper over `dist/cli.js`
- `.github/workflows/` contains CI, release-please, and npm publish workflows
- `.agents/skills/` and `.claude/skills/` contain mirrored local skill packs
- tests under `test/` protect the scaffold contract

## What The Repo Does And Does Not Do

This repo currently does:

- define the product contract for the MiMoCode setup tool
- provide npm packaging, CI, release-please, and publish scaffolding
- provide a public CLI entrypoint that can configure MiMoCode when the local
  `mimo` baseline, secret input, live model-catalog fetch, and
  effective-config verification pass
- provide docs and tests that protect the current runtime contract
- provide mirrored local skills for repo-aware agent work
- expose every model returned by GonkaGate `GET /v1/models` as a setup choice

This repo currently does not do:

- write direct MiMoCode `auth.json`
- mutate shell profiles
- generate `.env` files
- support arbitrary custom base URLs or arbitrary custom model ids in v1

## Repository Structure

```text
.
├── AGENTS.md
├── README.md
├── CHANGELOG.md
├── package.json
├── docs/
├── scripts/
├── src/
│   ├── cli.ts
│   ├── cli/
│   ├── constants/
│   ├── install/
│   └── entrypoint.ts
├── test/
├── .agents/skills/
└── .claude/skills/
```

## Important Surfaces

### `README.md`

Primary public repository summary. Keep implementation status, package name,
intended `npx` entrypoint, config targets, and security posture truthful.

### `docs/specs/mimo-code-setup-prd/spec.md`

The product source of truth for the setup tool.

### `docs/how-it-works.md`

Repository-level architecture contract for setup flow, scope behavior, and
future migration path.

### `docs/security.md`

Security and secret-handling contract. Any change to auth flow, secret storage,
or non-interactive setup must be reflected there.

### `src/cli.ts` and `src/cli/`

Current public entrypoint and split parse/execute/render seams.

### `src/install/`

Runtime implementation for installer contracts, dependency injection,
platform/path helpers, managed writes, rollback, verification, and redacted
results. The default public flow fetches the GonkaGate model catalog from
`/v1/models` after safe API-key intake.

### `src/install/model-catalog.ts`

Trust-boundary parser and fetch adapter for `GET /v1/models`. Keep it strict
about response shape and redaction-safe about failures.

### `src/constants/`

Package, provider, transport, path, and model-validation constants.

### `.agents/skills/` and `.claude/skills/`

Mirrored skill pack adapted from the shared GonkaGate setup baseline. Mirror
updates across both trees when shared skill content changes.

## Change Discipline

When behavior changes:

- update `AGENTS.md`
- update `README.md`
- update relevant files in `docs/`
- update `CHANGELOG.md` when the change is meaningful to users or contributors
- update tests under `test/` if the repository contract changed
- keep mirrored `.agents` and `.claude` skill assets aligned
- keep scaffold docs and future runtime docs explicitly labeled so they cannot
  contradict each other silently

Live catalog exposure must stay distinct from MiMoCode validation claims:

- do not claim every `/v1/models` entry has full MiMoCode workflow validation
  unless matching proof exists
- add runtime behavior tests before changing catalog fetch, model selection, or
  provider catalog write behavior
- update the validation proof ledger when a model gains or loses
  MiMoCode-specific validation status

Release Please must stay driven by releasable Conventional Commits:

- release-please runs on pushes to `main` and opens/updates a release PR only
  when commits since the latest `v*.*.*` tag contain a releasable Conventional
  Commit such as `feat:`, `fix:`, `perf:`, or a breaking-change marker
- when merging a user-visible behavior change that should produce a release PR,
  make the final merge/squash commit subject a releasable Conventional Commit
- plain subjects such as `Refactor installer runtime...` are valid git commits
  but are release-please no-ops; do not expect a release PR from them
- after merging to `main`, verify the `Release Please` workflow run for that
  push before assuming the release PR was created
- if the workflow succeeds but no release PR appears, inspect
  `rtk git log <latest-v-tag>..origin/main --format='%h %s'` for missing
  releasable Conventional Commit subjects
- if a releasable change already landed on `main` with a non-releasable subject,
  repair it with a minimal empty Conventional Commit on `main`, for example
  `rtk git commit --allow-empty -m "feat: fetch GonkaGate model catalog from /v1/models"`
- let release-please own version bumps, `CHANGELOG.md`,
  `.release-please-manifest.json`, and configured extra files instead of
  editing release artifacts manually during normal release flow

## Validation

Current local validation baseline:

```bash
npm run ci
```

That command should stay green before treating scaffold, contract, or doc
changes as ready.

@RTK.md
