# @gonkagate/mimo-code-setup

Set up local `mimo` to use GonkaGate in one `npx` command.

```bash
npx @gonkagate/mimo-code-setup
```

![Package](https://img.shields.io/badge/package-%40gonkagate%2Fmimo--code--setup-6E63FF?style=flat-square)
![Node](https://img.shields.io/badge/node-%3E%3D22.14.0-4DA2FF?style=flat-square)
![MiMoCode](https://img.shields.io/badge/MiMoCode-%3E%3D0.1.0-35D6FF?style=flat-square)
![License](https://img.shields.io/badge/license-Apache--2.0-2A2A2A?style=flat-square)

[![Website](https://img.shields.io/badge/Website-gonkagate.com-111827?style=flat-square)](https://gonkagate.com/en)
[![Docs](https://img.shields.io/badge/Docs-API%20Guides-2563EB?style=flat-square)](https://gonkagate.com/en/docs)
[![API%20Key](https://img.shields.io/badge/API%20Key-Dashboard-F97316?style=flat-square)](https://gonkagate.com/en/register)
[![Telegram](https://img.shields.io/badge/Telegram-%40gonkagate-229ED9?style=flat-square&logo=telegram&logoColor=white)](https://t.me/gonkagate)
[![X](https://img.shields.io/badge/X-%40gonkagate-000000?style=flat-square&logo=x&logoColor=white)](https://x.com/gonkagate)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-GonkaGate-0A66C2?style=flat-square&logo=linkedin&logoColor=white)](https://www.linkedin.com/company/gonkagate)

## Overview

`@gonkagate/mimo-code-setup` is the onboarding CLI for people who already use
MiMoCode and want it configured to use GonkaGate without hand-editing
MiMoCode config files, exporting secrets through shell profiles, or dealing
with provider internals.

The installer walks you through the setup, writes the minimum safe MiMoCode
config, verifies that MiMoCode actually resolves GonkaGate the way it should,
and then sends you back to plain `mimo`.

## What This Does For You

- Configures local `mimo` to use GonkaGate as a custom provider.
- Keeps the secret out of repository-local config.
- Preserves unrelated MiMoCode settings instead of replacing whole files.
- Verifies the real resolved MiMoCode result instead of assuming writes worked.
- Supports macOS, Linux, native Windows, and WSL.

## Quick Start

### Interactive setup

Use this if you are setting up your own machine:

```bash
npx @gonkagate/mimo-code-setup
```

The happy path is:

1. The CLI checks that `mimo` is installed and supported.
2. It selects a MiMoCode-validated GonkaGate model.
3. It asks whether GonkaGate should be activated for `user` or `project`
   scope.
4. It asks for your GonkaGate API key in a hidden prompt.
5. It writes the managed config, verifies the result, and tells you to go back
   to plain `mimo`.

### Non-interactive setup

Use this for automation or scripts:

```bash
npx @gonkagate/mimo-code-setup --scope project --yes
```

You can pass the secret through `GONKAGATE_API_KEY`:

```bash
GONKAGATE_API_KEY=gp-... npx @gonkagate/mimo-code-setup --scope project --yes
```

Or through stdin with `--api-key-stdin`:

```bash
printf '%s' "$GONKAGATE_API_KEY" | npx @gonkagate/mimo-code-setup --api-key-stdin --scope project --yes --json
```

If you run non-interactively, pass `--scope` or `--yes`. In a git repository,
the recommended default is usually `project`; outside a repo, it is usually
`user`.

## Before You Run It

You need:

- Node `>=22.14.0`
- local MiMoCode installed and available as `mimo` on your `PATH`
- a GonkaGate API key in the usual `gp-...` format
  from [GonkaGate](https://gonkagate.com/en/register)

Current MiMoCode baseline:

- minimum verified MiMoCode version: `0.1.0`
- audited upstream package: `@mimo-ai/cli` `0.1.0` as of June 11, 2026

## What The Installer Actually Changes

The default public flow is:

```bash
npx @gonkagate/mimo-code-setup
```

Under the hood, the shipped runtime:

- validates local `mimo`
- resolves the validated model and activation scope
- accepts the secret only through a hidden prompt, `GONKAGATE_API_KEY`, or
  `--api-key-stdin`
- writes only the minimum safe MiMoCode config layers
- verifies the durable plain-`mimo` outcome and the current session's effective
  MiMoCode outcome
- finishes by returning the user to plain `mimo`

For `project` scope, the installer keeps the provider definition and secret
binding in user scope and writes only activation settings to repo-local
`.mimocode/mimocode.json`.

## Where Files Go

The important managed locations are:

- durable global config target: `~/.config/mimocode/mimocode.json`
- created global config filename when no existing target is present:
  `mimocode.jsonc`
- project config target: `.mimocode/mimocode.json`
- managed secret file: `~/.gonkagate/mimo-code/api-key`
- managed install state: `~/.gonkagate/mimo-code/install-state.json`
- project-config rollback backup path:
  `~/.gonkagate/mimo-code/backups/project-config`

The canonical installer-owned secret binding is exactly:

`provider.gonkagate.options.apiKey = {file:~/.gonkagate/mimo-code/api-key}`

That binding belongs in user config. The repo-local file stays commit-safe by
default and must not contain the secret or the secret file path.

## Safe Inputs And Security Rules

Safe secret inputs:

- hidden interactive prompt
- `GONKAGATE_API_KEY`
- `--api-key-stdin`

Not supported:

- plain `--api-key`
- shell profile mutation
- `.env` generation
- repository-local secret storage

The installer never prints the GonkaGate key. It also redacts secret-bearing
fields on user-facing diagnostics.

On macOS, Linux, and WSL, the managed secret file and directory use owner-only
permissions, and reruns repair drifted owner-only secret protections in place
without rewriting unchanged secret contents.

On native Windows, managed files stay inside the current user's profile and
rely on inherited per-user ACLs instead of portable `chmod`-style enforcement.

## Current Product Truth

The current validated MiMoCode model is:

- `moonshotai/kimi-k2.6`

The curated registry also carries candidate entries for future gated MiMoCode
proof:

- `minimaxai/minimax-m2.7`
- `qwen/qwen3-235b-a22b-instruct-2507-fp8`

The runtime is curated-model-first:

- the stable provider id is `gonkagate`
- the managed user-level provider key is `provider.gonkagate`
- the canonical base URL is `https://api.gonkagate.com/v1`
- the current provider package is `@ai-sdk/openai-compatible`
- the current transport target is `chat_completions`
- future migration should add `responses` support without renaming the product
- the selected setup model remains the activation default through `model` and
  `small_model`
- the curated registry can carry compatibility metadata, provider options,
  model options, and headers when a validated MiMoCode flow needs them

## Verification And Config Precedence

This installer does not treat a successful file write as success by itself.
Success is based on effective MiMoCode config.

For durable verification, `mimo --pure debug config` is the final truth source.
The installer uses that resolved result to verify `model`, `small_model`,
`provider.gonkagate`, the validated transport and base URL shape, and the
validated model catalog shape.

The installer also runs `mimo models gonkagate` and checks that the selected
validated GonkaGate model is visible to MiMoCode.

MiMoCode override state matters here:

- `MIMOCODE_CONFIG`
- `MIMOCODE_CONFIG_CONTENT`
- `MIMOCODE_CONFIG_DIR`
- `MIMOCODE_AUTH_CONTENT`
- `MIMOCODE_DISABLE_PROJECT_CONFIG`

If the resolved config proves a provider or model blocker but no locally
inspectable layer explains it, the installer reports an inferred higher
precedence or managed blocker instead of a vague mismatch.

Secret-binding provenance is verified separately from resolved-config
verification. `user_config` is the durable layer allowed to own
`provider.gonkagate.options.apiKey`, and project config must not define that
key.

The durable migration anchor remains `install-state.json`. Its
`lastDurableSetupAt` field means the last durably verified setup, even if a
later current-session-only check is still blocked or failed.

## Reruns, Scope, And Rollback

Rerunning the installer is the official safe update path.

That rerun flow refreshes GonkaGate-managed config, secret storage, and
install-state metadata. It also normalizes only installer-owned GonkaGate
activation in the old target instead of deleting unrelated MiMoCode settings.

For `project` scope:

- user-level config still owns the provider definition and secret binding
- repo-local `.mimocode/mimocode.json` contains only activation settings
- if repo-local config must be rewritten, rollback backups go under
  `~/.gonkagate/mimo-code/backups/project-config`

## Windows Support

Native Windows is part of the supported runtime contract. Managed files stay
inside the current user's profile and rely on inherited per-user ACLs instead
of portable `chmod`-style enforcement.

WSL remains supported too.

## Docs

- [Documentation Index](docs/README.md)
- [How It Works](docs/how-it-works.md)
- [Model Validation](docs/model-validation.md)
- [Runtime Contract Map](docs/runtime-contract-map.md)
- [Security Notes](docs/security.md)
- [Troubleshooting](docs/troubleshooting.md)
- [PRD](docs/specs/mimo-code-setup-prd/spec.md)

## Links

- [GonkaGate](https://gonkagate.com/en)
- [API Guides](https://gonkagate.com/en/docs)
- [Get an API key](https://gonkagate.com/en/register)
- [Telegram](https://t.me/gonkagate)
- [X](https://x.com/gonkagate)
- [LinkedIn](https://www.linkedin.com/company/gonkagate)
