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
- `moonshotai/kimi-k2.6` is MiMoCode-validated for the current
  `@mimo-ai/cli` `0.1.0` baseline and is the recommended public default
- `minimaxai/minimax-m2.7` and
  `qwen/qwen3-235b-a22b-instruct-2507-fp8` remain MiMoCode candidates, not
  public validated models

If implementation status, package name, security flow, config locations,
transport contract, or verified MiMoCode baseline changes, this file must be
updated immediately so it stays truthful.

## Product Goal

The intended happy path is:

1. user runs `npx @gonkagate/mimo-code-setup`
2. installer validates local `mimo`
3. installer offers only MiMoCode-validated GonkaGate models
4. installer asks for `user` or `project` scope
5. installer collects a GonkaGate `gp-...` key through a hidden prompt,
   `GONKAGATE_API_KEY`, or `--api-key-stdin`
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
- `src/install/` contains successful setup orchestration for the validated
  public registry and preserves the blocked path for custom candidate-only
  registries
- `src/constants/` pins package, provider, transport, config, and
  model-registry contracts
- `bin/gonkagate-mimo-code.js` is a thin wrapper over `dist/cli.js`
- `.github/workflows/` contains CI, release-please, and npm publish workflows
- `.agents/skills/` and `.claude/skills/` contain mirrored local skill packs
- tests under `test/` protect the scaffold contract

## What The Repo Does And Does Not Do

This repo currently does:

- define the product contract for the MiMoCode setup tool
- provide npm packaging, CI, release-please, and publish scaffolding
- provide a public CLI entrypoint that can configure MiMoCode when the local
  `mimo` baseline, secret input, and effective-config verification pass
- provide docs and tests that protect the current runtime contract
- provide mirrored local skills for repo-aware agent work
- expose `moonshotai/kimi-k2.6` as the current MiMoCode-validated public model

This repo currently does not do:

- expose candidate-only GonkaGate models as public setup choices
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
results. The default public registry currently exposes `moonshotai/kimi-k2.6`
after MiMoCode validation proof.

### `src/constants/`

Package, provider, transport, path, and model-registry constants.

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

Additional public model exposure is blocked until each model is
MiMoCode-validated:

- do not write docs that claim candidate model setup success before
  model-validation proof exists
- add runtime behavior tests before claiming any new end-user capability
- update the curated model registry truth when MiMoCode validation status
  changes

## Validation

Current local validation baseline:

```bash
npm run ci
```

That command should stay green before treating scaffold, contract, or doc
changes as ready.

@RTK.md
