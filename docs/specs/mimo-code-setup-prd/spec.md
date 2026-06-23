# GonkaGate MiMoCode Setup PRD

## Research Baseline

This PRD is based on a source audit of `XiaomiMiMo/MiMo-Code` at main commit
`e96727a32068e5b52a8d4ae30749199f7d273711` on June 11, 2026, plus an npm
registry check that reported `@mimo-ai/cli` version `0.1.0`.
The latest upstream tag found during research was `v0.1.0`; current `main`
must not be assumed to exactly match the published package without a fresh
audit.

Compatibility status as of June 11, 2026: the planned `provider.gonkagate`
shape is compatible with the official `@mimo-ai/cli` `0.1.0` source and npm
package, provided the implementation honors MiMoCode's actual config-layer
ordering, uses full-slug model keys, disables AI SDK prompt cache keys for
GonkaGate chat-completions, and keeps resolved debug output redacted.

Relevant upstream facts at that baseline:

- the public MiMoCode npm package is `@mimo-ai/cli`
- the public MiMoCode binary is `mimo`
- MiMoCode supports custom OpenAI-compatible providers in the TUI
- global config is under MiMoCode's config directory, normally
  `~/.config/mimocode/`
- project config is documented as `.mimocode/mimocode.json`
- the source also reads `mimocode.json` / `mimocode.jsonc` from project
  ancestors and `.mimocode/mimocode.json` / `.mimocode/mimocode.jsonc` from
  discovered `.mimocode` directories
- `MIMOCODE_HOME`, when set to an absolute path, moves MiMoCode data, cache,
  config, and state under that root
- `mimo debug paths` can show resolved global paths
- `mimo --pure debug config` can show resolved config while disabling external
  plugins
- `mimo debug config` may normalize schema-less config files by writing a
  `$schema`, so it must not be described as a strictly read-only operation
- `mimo models [provider]` can list provider models and is useful for
  post-write provider-catalog verification
- MiMoCode exposes auth commands such as `mimo auth list`,
  `mimo auth login`, and `mimo auth logout`
- raw resolved config is secret-bearing because config substitution expands
  `{env:...}` and `{file:...}` before parsing
- the native custom-provider TUI writes provider config to global config and
  writes the API key through MiMoCode auth storage
- MiMoCode auth storage is `auth.json` under MiMoCode data storage
- MiMoCode provider config supports `provider.<id>.options.apiKey`,
  `baseURL`, `setCacheKey`, provider `npm`, and model-specific metadata
- MiMoCode bundles `@ai-sdk/openai-compatible`
- custom provider ids such as `gonkagate` are allowed by config shape
- slash-containing model refs are supported because MiMoCode treats the first
  path segment as provider id and rejoins the rest as model id

If any of those upstream facts change, this PRD must be updated before the
installer implementation claims support for the changed MiMoCode version.

## Problem

GonkaGate needs a first-class setup tool for MiMoCode because the native
custom-provider path still asks too much from end users:

- they need to know that GonkaGate should be added as a custom provider
- they need to know the canonical GonkaGate base URL
- they need to choose the right AI SDK provider package
- they need to know which GonkaGate models are safe with MiMoCode
- they need to decide whether config belongs in user or project scope
- they need to avoid leaking the `gp-...` API key into project files, shell
  history, logs, process listings, or raw resolved-config output

That is too much friction for a coding-agent onboarding flow. The intended
experience should be one short setup command followed by normal `mimo` usage.

## Desired Behavior

The user runs:

```bash
npx @gonkagate/mimo-code-setup
```

The tool:

1. validates local `mimo`
2. verifies that the installed MiMoCode version is not older than the minimum
   supported version
3. accepts a GonkaGate API key through a masked prompt, `GONKAGATE_API_KEY`, or
   `--api-key-stdin`
4. calls `GET /v1/models` with that key and offers every returned GonkaGate
   model id
5. lets the user choose `user` or `project` scope
6. writes the minimum safe MiMoCode config automatically
7. stores the secret outside the repository
8. verifies durable raw config provenance separately from resolved MiMoCode
   config
9. verifies both durable plain-`mimo` behavior and the current session's
   effective behavior when runtime override variables are present
10. never requires manual edits to MiMoCode config files
11. never requires shell profile mutation or `.env` generation
12. sends the user back to normal `mimo`

The success screen should end with:

```bash
mimo
```

## Users

Primary user:

- a developer with local MiMoCode who wants GonkaGate without manual custom
  provider wiring

Secondary user:

- a team that wants repeatable project-level MiMoCode activation without
  committing secrets

Contributor user:

- a maintainer validating GonkaGate models for documented MiMoCode workflow
  proof

## In Scope

- one public npm package: `@gonkagate/mimo-code-setup`
- one public repository: `GonkaGate/mimo-code-setup`
- configuration of already installed local MiMoCode
- masked or automation-safe secret input
- installer-owned managed secret file
- live GonkaGate model picker backed by `GET /v1/models`
- `user` and `project` setup scope
- managed config writes with backups
- effective-config verification through MiMoCode's debug/config surfaces
- rerun-safe migration state for future installer updates
- macOS, Linux, native Windows, and WSL usage when backed by tests or CI proof

## Out Of Scope

- installing MiMoCode
- writing shell profiles
- creating `.env` files
- accepting a plain `--api-key` flag
- arbitrary custom base URLs
- arbitrary custom model ids outside the authenticated GonkaGate catalog
- writing directly to MiMoCode `auth.json` in v1
- claiming `/v1/responses` support today
- configuring non-GonkaGate providers
- changing MiMoCode itself

## Constraints

### GonkaGate Constraints

- stable provider id: `gonkagate`
- stable display name: `GonkaGate`
- canonical base URL: `https://api.gonkagate.com/v1`
- current setup transport: OpenAI-compatible chat-completions behavior through
  `@ai-sdk/openai-compatible`
- future `/v1/responses` support must be a migration, not a product rename
- setup docs must stay honest about the current transport reality

### MiMoCode Constraints

- the target CLI is `mimo`
- the target package being configured is `@mimo-ai/cli`
- the minimum supported upstream version is `@mimo-ai/cli` `0.1.0`
- newer MiMoCode versions must not be blocked solely because they are newer
- MiMoCode global config defaults to the XDG config home under `mimocode`
- `MIMOCODE_HOME` changes the config, data, state, and cache roots
- MiMoCode global config candidates include `mimocode.jsonc`,
  `mimocode.json`, and `config.json`
- MiMoCode global config merge order is `config.json`, then `mimocode.json`,
  then `mimocode.jsonc`
- MiMoCode project config can be discovered from project `mimocode.json` /
  `mimocode.jsonc` and `.mimocode/mimocode.json` /
  `.mimocode/mimocode.jsonc`
- MiMoCode config supports `model` and `small_model` refs in
  `provider/model` format
- MiMoCode config supports `enabled_providers` and `disabled_providers`
- MiMoCode provider config supports `whitelist` and `blacklist` per provider
- MiMoCode config supports model groups, including built-in tier names such as
  `ultra`, `standard`, and `lite`
- MiMoCode resolves provider SDK options from provider config, auth storage,
  environment variables, and model-specific overrides
- `mimo debug config` prints resolved config and must be treated as
  secret-bearing
- `mimo --pure` disables external plugins, but does not by itself remove all
  runtime config override surfaces
- `MIMOCODE_CONFIG` is loaded after global config and before project config;
  `MIMOCODE_CONFIG_CONTENT` is runtime-only and loaded later
- `MIMOCODE_DISABLE_PROJECT_CONFIG` disables discovered project config files and
  directories, but does not disable `MIMOCODE_CONFIG_DIR`

### Product Constraints

- setup must feel simpler than MiMoCode's native custom-provider wizard
- secrets must stay out of git
- unrelated MiMoCode config must be preserved
- project scope must remain commit-safe
- installer success must be based on effective MiMoCode behavior, not only
  successful file writes
- rerunning the installer is the official migration path
- docs, tests, and PRD must clearly separate shipped runtime facts from future
  work

## Decisions

### Package Identity

- package name: `@gonkagate/mimo-code-setup`
- public entrypoint: `npx @gonkagate/mimo-code-setup`
- stable provider id: `gonkagate`
- stable display name: `GonkaGate`
- normal next command after setup: `mimo`

The package identity must not change if GonkaGate later migrates from
chat-completions compatibility to responses support.

### Minimum Supported MiMoCode Version

The minimum supported MiMoCode version is:

- `@mimo-ai/cli >= 0.1.0`

Installer behavior:

- missing `mimo`: stop with MiMoCode install guidance
- version lower than `0.1.0`: stop and request upgrade
- version equal to or newer than `0.1.0`: continue
- future MiMoCode versions are validated by the actual setup and effective-config
  verification flow, not by a hardcoded audited-version ceiling

The minimum supported MiMoCode version must be visible in README, security docs,
and the PRD whenever it changes.

### Secret Inputs

Allowed:

- masked interactive prompt
- `GONKAGATE_API_KEY`
- `--api-key-stdin`

Disallowed:

- plain `--api-key`
- command-line flags that carry the key value
- writing shell profiles
- `.env` generation

The installer may read `GONKAGATE_API_KEY` as setup input, but the durable
runtime contract must not depend on users keeping that environment variable in
their shell.

### Secret Storage

The installer stores the GonkaGate API key in a GonkaGate-managed user file:

- POSIX and WSL path: `~/.gonkagate/mimo-code/api-key`
- native Windows path:
  `%USERPROFILE%\\.gonkagate\\mimo-code\\api-key`

The installer writes managed install state to:

- POSIX and WSL path: `~/.gonkagate/mimo-code/install-state.json`
- native Windows path:
  `%USERPROFILE%\\.gonkagate\\mimo-code\\install-state.json`

The canonical installer-owned secret binding in MiMoCode config is:

```json
{
  "provider": {
    "gonkagate": {
      "options": {
        "apiKey": "{file:~/.gonkagate/mimo-code/api-key}"
      }
    }
  }
}
```

Why this binding is the v1 product decision:

- MiMoCode config substitution supports `{file:...}`
- MiMoCode provider options support `apiKey`
- MiMoCode passes provider options into the bundled provider factory
- the raw config stores only a file reference, not the key
- the installer can prove provenance from raw config separately from resolved
  config
- the installer does not need to write MiMoCode `auth.json`

The installer must not write directly to MiMoCode `auth.json` in v1.

MiMoCode's native custom-provider TUI currently uses `auth.json` for API-key
storage. That is a native MiMoCode path, but it is not the installer-owned v1
path because it would make installer provenance harder and would place raw
GonkaGate credentials in MiMoCode auth storage rather than GonkaGate-managed
storage.

On POSIX-supported platforms, reruns must repair drifted managed-secret file
and directory permissions in place when the secret contents already match,
without rewriting the secret or creating a backup.

On native Windows, managed files must remain inside the current user's profile
and the implementation must describe Windows protection in terms of inherited
per-user ACLs rather than claiming portable POSIX `chmod` behavior.

### Managed State

`install-state.json` records:

- installer version
- selected model key
- selected scope
- minimum supported MiMoCode version
- selected MiMoCode version
- selected transport contract
- selected provider package
- managed global config target
- managed project config target when project scope is used
- previous installer-owned model ref
- `lastDurableSetupAt`

`lastDurableSetupAt` means the last setup time at which durable raw config,
secret file provenance, and durable effective MiMoCode config were verified.
It does not promise that every later current-session override also passed.

That state file is the migration anchor for future upgrades, including any
future move from `@ai-sdk/openai-compatible` to a responses-capable provider
path.

### Config Targets

The installer must resolve MiMoCode paths by using MiMoCode-observable behavior
where possible:

1. prefer `mimo debug paths` when available
2. otherwise reproduce MiMoCode's `MIMOCODE_HOME` and XDG path resolution
3. never assume `~/.config/mimocode` when `MIMOCODE_HOME` is set

Global config target:

- if one of `mimocode.jsonc`, `mimocode.json`, or `config.json` already exists
  in MiMoCode's config directory, preserve that existing target choice
- if no global config file exists, create `mimocode.jsonc`
- verification must inspect all global candidates in MiMoCode's merge order,
  not only the file the installer writes

Project config target for v1:

- `<project-root>/.mimocode/mimocode.json`

Why project scope uses `.mimocode/mimocode.json`:

- MiMoCode documents `.mimocode/mimocode.json` as the project config path
- MiMoCode reads `.mimocode/mimocode.json` and `.mimocode/mimocode.jsonc`
- writing project activation there avoids taking ownership of a user's
  existing top-level `mimocode.json` unless a future PRD explicitly expands
  ownership

Project root is the current working directory or the nearest enclosing git
root. If git discovery is disabled or unavailable, the installer may treat the
current working directory as the project root and must say so.

Project-config rollback backup root:

- POSIX and WSL path:
  `~/.gonkagate/mimo-code/backups/project-config`
- native Windows path:
  `%USERPROFILE%\\.gonkagate\\mimo-code\\backups\\project-config`

Repository-local backups beside `.mimocode/mimocode.json` are disallowed.

### Scope Model

`user` scope:

- write provider definition to MiMoCode global config
- write secret binding to MiMoCode global config
- write `model` and `small_model` activation to MiMoCode global config
- keep secret and install state in GonkaGate-managed user storage
- remove installer-owned stale GonkaGate activation from the old project target

`project` scope:

- write provider definition to MiMoCode global config
- write secret binding to MiMoCode global config
- keep secret and install state in GonkaGate-managed user storage
- write only activation settings to `<project-root>/.mimocode/mimocode.json`
- keep rollback backups under the GonkaGate user backup root
- remove installer-owned stale GonkaGate activation from the old user target

Project config must never contain:

- the raw `gp-...` key
- the managed secret file path
- `provider.gonkagate.options.apiKey`
- MiMoCode auth storage data

This keeps project config commit-safe by default.

### Provider Config Shape

The managed global provider definition must be equivalent to this shape, with
the actual `models` entries generated from GonkaGate `/v1/models`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "gonkagate": {
      "name": "GonkaGate",
      "npm": "@ai-sdk/openai-compatible",
      "options": {
        "apiKey": "{file:~/.gonkagate/mimo-code/api-key}",
        "baseURL": "https://api.gonkagate.com/v1",
        "setCacheKey": false
      },
      "models": {
        "<provider-slug>/<model-slug>": {
          "name": "<display name>",
          "limit": {
            "context": 0,
            "output": 0
          }
        }
      }
    }
  }
}
```

The installer should not write `provider.gonkagate.env` as a durable runtime
dependency in v1. `GONKAGATE_API_KEY` is setup input, not the normal
post-setup runtime path.

The managed activation shape is:

```json
{
  "model": "gonkagate/<provider-slug>/<model-slug>",
  "small_model": "gonkagate/<provider-slug>/<model-slug>"
}
```

`setCacheKey` must be `false` for the current chat-completions transport:
live GonkaGate requests reject the non-standard `promptCacheKey` parameter
emitted by the AI SDK when cache keys are enabled.

### Model Strategy

The onboarding flow must fetch the live GonkaGate catalog after safe API-key
intake.

Runtime model source:

- endpoint: `GET https://api.gonkagate.com/v1/models`
- auth: `Authorization: Bearer <gp-key>`
- expected response shape: `{ "object": "list", "data": [{ "id": "..."}] }`
- setup keys: every returned `data[].id`

The installer must not hardcode the public setup model list. It should parse
the authenticated `/v1/models` response, preserve the returned order, dedupe
duplicate ids, and write every returned model id under
`provider.gonkagate.models`.

Model ids must map cleanly to MiMoCode's `provider/model` model-ref format.
Because MiMoCode treats the first slash segment as provider id and rejoins the
rest as model id, GonkaGate model ids must be written using the full upstream
slug, for example `moonshotai/kimi-k2.6`. The selected default is written as
`gonkagate/<provider-slug>/<model-slug>`.

GonkaGate `/v1/models` availability is the public setup-catalog source of
truth. MiMoCode workflow validation records remain a separate proof ledger for
claims about richer MiMoCode behavior.

### Model Validation Proof

A model may be documented as MiMoCode workflow-validated only after end-to-end
verification against a named MiMoCode version for the workflows the product
claims to support.

Minimum validation proof for a GonkaGate model includes:

- `mimo` TUI startup with the selected model active
- `mimo run` with the selected model
- streaming text responses
- tool calling
- file edit loops
- multi-turn continuation
- `small_model` behavior used by lightweight MiMoCode tasks
- provider/model switching through the MiMoCode model picker after setup
- `mimo --pure debug config` effective-config proof
- user-scope setup
- project-scope setup
- current-session override detection when `MIMOCODE_CONFIG`,
  `MIMOCODE_CONFIG_CONTENT`, or `MIMOCODE_AUTH_CONTENT` is present
- config-layer precedence proof for global config, `MIMOCODE_CONFIG`, project
  config, `.mimocode` config, `MIMOCODE_CONFIG_DIR`, and
  `MIMOCODE_CONFIG_CONTENT`

If GonkaGate later claims MiMoCode-specific memory, checkpoint, subagent,
compose, dream, distill, voice, or max-mode compatibility, the model must be
validated for those flows before the product advertises that support.

A model must not be documented as workflow-validated if its working setup
depends on undocumented manual tweaks that are not representable in the
managed provider config contract.

### `small_model` Policy

The installer must explicitly set both:

- `model`
- `small_model`

In v1 they should be set to the same selected GonkaGate model.

Why:

- keeps default MiMoCode traffic on the selected GonkaGate model
- avoids implicit `lite` tier fallbacks that have not been validated against
  GonkaGate
- keeps the product honest until a cheaper validated small-model strategy
  exists

The selected model is only the setup default. The installer must also write
every model returned by GonkaGate `/v1/models` into
`provider.gonkagate.models` so MiMoCode's model picker can switch between
managed GonkaGate models after setup.

### Current Transport Strategy

Current v1 truth:

- provider package: `@ai-sdk/openai-compatible`
- base URL: `https://api.gonkagate.com/v1`
- transport contract: OpenAI-compatible chat-completions behavior

The setup tool must not imply `/v1/responses` support today.

### Future Transport Migration

The product must remain ready for a later responses migration.

Migration contract:

- provider id remains `gonkagate`
- package identity remains `@gonkagate/mimo-code-setup`
- secret location remains stable
- rerunning the installer is the official migration path
- live catalog and install-state metadata decide whether migration happens
  through:
  - a whole-provider package change
  - or a per-model provider override

### Config Ownership

The installer owns only the GonkaGate-managed subset of config.

User-level managed keys:

- `provider.gonkagate` in MiMoCode global config
- the full live GonkaGate model catalog returned by `/v1/models` under
  `provider.gonkagate.models`
- `provider.gonkagate.options.apiKey` with the canonical file binding
- GonkaGate-managed `model` when scope is `user`
- GonkaGate-managed `small_model` when scope is `user`
- stale activation cleanup in the old target only when the installer can prove
  ownership through current live GonkaGate refs or install state

Project-level managed keys:

- GonkaGate-managed `model` when scope is `project`
- GonkaGate-managed `small_model` when scope is `project`

The installer does not own:

- unrelated providers
- unrelated model groups
- unrelated agents, commands, plugins, MCP servers, memory, checkpoint, UI,
  permissions, formatter, LSP, or tool settings
- MiMoCode `auth.json`
- non-owned `model` / `small_model` refs
- non-owned GonkaGate refs that are not in install state or the live model
  catalog

The installer must preserve unrelated config.

### Blocker Detection

The installer must treat these as possible blockers before reporting success:

- `enabled_providers` that excludes `gonkagate`
- `disabled_providers` that includes `gonkagate`
- `provider.gonkagate.whitelist` that excludes the selected model
- `provider.gonkagate.blacklist` that includes the selected model
- `MIMOCODE_CONFIG` conflicts between global and project/local layers
- runtime `MIMOCODE_CONFIG_CONTENT`
- `MIMOCODE_CONFIG_DIR` conflicts, including when project config is disabled
- runtime `MIMOCODE_AUTH_CONTENT`
- `MIMOCODE_DISABLE_PROJECT_CONFIG` when project scope is selected
- `MIMOCODE_HOME` pointing at a different profile than the one the user
  expected
- MiMoCode account or remote org config that overrides the provider or model
- file-based system managed config
- macOS managed preferences

Exact blocker attribution is guaranteed only for locally inspectable layers.
When resolved MiMoCode config proves a blocker but no locally inspectable layer
explains it, the installer must report an inferred remote, managed, or
higher-precedence blocker instead of a generic mismatch.

### Write Behavior

When a target config already exists, the installer must:

1. parse JSON or JSONC safely
2. refuse to continue if safe merge is impossible
3. create a timestamped rollback backup
4. preserve unrelated config
5. add `$schema` if missing
6. rewrite only GonkaGate-managed keys
7. write stable and readable output
8. verify the durable and current-session effective result before reporting
   success

When project scope rewrites `.mimocode/mimocode.json`, the rollback backup
must live under `~/.gonkagate/mimo-code/backups/project-config`, not beside the
project file.

When scope normalization encounters non-owned activation in the old target, it
must leave that value in place and rely on verification to report any
remaining precedence conflict.

### Verification UX

Installer success must be based on effective MiMoCode config, not only file
writes.

Before claiming success, the installer must:

- verify the managed secret file exists
- verify the managed secret file contains the intended key without printing it
- verify POSIX permissions where supported
- verify raw global config contains the canonical
  `provider.gonkagate.options.apiKey` file binding
- verify raw project config does not contain the secret or secret file path
- capture `mimo --pure debug config` output internally
- treat `mimo --pure debug config` as a verification command that may trigger
  upstream config normalization, not as a guaranteed no-write command
- parse resolved config internally
- never print raw resolved config
- never ask users to paste raw `mimo debug config` output into support issues,
  because it can contain substituted secrets
- redact secret-bearing fields from diagnostics and error paths
- use `mimo models gonkagate` or an equivalent provider-listing path to verify
  that the managed provider catalog is visible to MiMoCode
- verify `model` and `small_model`
- verify `provider.gonkagate`
- verify provider package, base URL, and current transport shape
- verify the live model catalog shape
- verify provider allow/deny gating
- verify selected model whitelist/blacklist gating
- prove the durable plain-`mimo` result separately from current-session
  runtime overrides
- verify the current session with the actual relevant environment variables
  still active

The durable verification should run with a controlled environment that removes
runtime-only overrides such as `MIMOCODE_CONFIG_CONTENT` when proving durable
plain-`mimo` behavior.

The current-session verification should run with the user's actual current
environment and report `blocked` when runtime overrides change the active
result away from the intended GonkaGate setup.

The setup tool must not depend on a future `gonkagate doctor`.

## Functional Requirements

1. Users must be able to configure GonkaGate for MiMoCode in one `npx`
   command.
2. Users must not need to hand-edit MiMoCode config.
3. Users must be able to choose `user` or `project` scope.
4. The installer must store the secret only outside the repository.
5. The installer must not write directly to MiMoCode `auth.json` in v1.
6. The installer must configure GonkaGate with the current
   `@ai-sdk/openai-compatible` provider package.
7. The installer must use the canonical GonkaGate base URL.
8. The installer must fetch the public setup model list from GonkaGate
   `/v1/models` after safe API-key intake.
9. The installer must preserve unrelated MiMoCode config.
10. The installer must set `model` and `small_model` explicitly.
11. The installer must support rerun as the official update path.
12. The installer must treat `MIMOCODE_HOME` as part of path resolution.
13. The installer must treat `MIMOCODE_CONFIG` as an inspectable override
    layer when present.
14. The installer must treat `MIMOCODE_CONFIG_CONTENT` as runtime-only
    override content, not as a durable install target.
15. The installer must detect provider allow/deny blockers.
16. The installer must detect selected-model whitelist/blacklist blockers.
17. The installer must verify durable raw config and resolved effective config
    before reporting success.
18. The installer must verify current-session effective config separately when
    runtime overrides are present.
19. The installer must not print raw resolved-config output.
20. The installer must redact `gp-...` secrets on every user-facing error path.
21. The installer must write rollback backups before replacing managed user or
    project files.
22. The installer must keep project scope commit-safe by default.
23. The live model catalog parser must reject malformed `/v1/models` responses
    before writing config.
24. The installer must write every returned GonkaGate model id into
    `provider.gonkagate.models`.
25. The installer must report inferred remote or managed blockers when
    resolved config proves a mismatch without a locally inspectable cause.

## Non-Functional Requirements

1. Setup should feel simpler than MiMoCode's native custom-provider wizard.
2. Secret handling must be safe by default.
3. Config writes must be reversible through backups.
4. Project scope must remain safe to commit.
5. The tool must be production-ready on macOS, Linux, native Windows, and WSL
   only when that support is backed by CI or integration proof.
6. Native Windows secret and state handling must be explicit about relying on
   current-user profile ACL inheritance instead of portable owner-only `chmod`.
7. Future responses migration must not require a new package identity.
8. Interactive setup should fetch the live model catalog before showing the
   model picker.
9. Safe non-interactive setup may accept recommended defaults only when the
   installer has enough information to do so without ambiguity.
10. Diagnostics must be actionable without exposing secrets.
11. Validation proof must be narrow enough to run locally but broad enough to
    cover the claimed MiMoCode behavior.

## Deferred Work

- uninstall or repair command
- native MiMoCode `auth.json` integration, if a later product decision chooses
  to use it
- richer post-setup live GonkaGate session verification
- richer live catalog metadata, if `/v1/models` starts returning it
- cheaper validated `small_model` strategy
- MiMoCode model-group integration
- future `/v1/responses` migration
- automated upstream MiMoCode compatibility audit
- live MiMoCode TUI automation beyond the minimum validation gate

## Risks

- MiMoCode is new and upstream config behavior may change quickly.
- MiMoCode config precedence differs from the earlier OpenCode setup mental
  model; treating `MIMOCODE_CONFIG` as top precedence or ignoring root
  `mimocode.json(c)` can produce false success.
- MiMoCode still carries some OpenCode names in schemas, managed config paths,
  and docs, so implementation must audit actual MiMoCode behavior instead of
  assuming labels are current.
- `mimo debug config` expands secret-bearing config values, so careless
  logging can leak the GonkaGate key.
- If the installer writes the secret path into project config, users can leak
  local machine details into git.
- If the installer writes raw secrets into project config, users can leak live
  credentials into git.
- If runtime override layers are ignored, setup can report success while
  `mimo` still uses a different provider.
- If GonkaGate `/v1/models` returns a malformed or partial catalog, the setup
  picker can misrepresent available models unless the boundary parser blocks
  before config writes.
- If live catalog availability is confused with MiMoCode workflow validation,
  the product can overclaim support for workflows that have not been proven in
  MiMoCode.
- If Windows support is claimed without native proof, the secret protection and
  path-resolution story may be wrong.

## Product Summary

`@gonkagate/mimo-code-setup` should be the GonkaGate-owned onboarding path for
MiMoCode:

```bash
npx @gonkagate/mimo-code-setup
mimo
```

The installer should configure GonkaGate as a MiMoCode custom provider with a
live `/v1/models` provider catalog, a safe managed secret file, scope-aware
config writes, rollback backups, and effective-config verification. It should
preserve MiMoCode's normal user experience while removing the need for users
to understand custom-provider internals.
