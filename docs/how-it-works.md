# How It Works

`mimo-code-setup` configures MiMoCode to use GonkaGate as a custom provider.
The current repository contains the product contract and installer runtime.
The public model picker is populated from GonkaGate `GET /v1/models` after
safe API-key intake, so it follows the live GonkaGate model catalog instead of
a hardcoded allowlist.

## Planned Flow

1. Validate that the local `mimo` CLI is available and not older than the
   minimum supported MiMoCode version.
2. Resolve safe config and state paths without mutating shell profiles or `.env`
   files.
3. Collect a GonkaGate API key through safe inputs only:
   `GONKAGATE_API_KEY`, masked interactive prompt, or `--api-key-stdin`.
4. Fetch `https://api.gonkagate.com/v1/models` with Bearer auth and build the
   setup picker from every returned model id, using the live `name`,
   `description`, and `context_length` when the gateway publishes them. The
   non-interactive default is the first model of the response.
5. Store the secret under `~/.gonkagate/mimo-code/api-key`.
6. Write user-level provider config for `provider.gonkagate`.
7. Write only activation settings for project scope.
8. Verify durable config and current-session effective config without printing
   raw resolved config.

## MiMoCode Surfaces

The PRD is based on the MiMoCode upstream contract observed on 2026-06-11,
with newer MiMoCode versions allowed by default:

- CLI command: `mimo`
- npm package: `@mimo-ai/cli`
- global config: MiMoCode's resolved config directory; preserve an existing
  `mimocode.jsonc`, `mimocode.json`, or `config.json`, otherwise create
  `mimocode.jsonc`
- project config: `.mimocode/mimocode.json`
- config overrides: `MIMOCODE_CONFIG`, `MIMOCODE_CONFIG_CONTENT`,
  `MIMOCODE_CONFIG_DIR`, and `MIMOCODE_HOME`
- verification commands: `mimo debug paths`, `mimo --pure debug config`, and
  `mimo models gonkagate`

`mimo --pure debug config` is useful proof, but it prints substituted
secret-bearing config and may let upstream normalize schema-less config files.
The installer must capture it internally, parse it, redact it, and never ask
users to paste its raw output.

MiMoCode loads global config before `MIMOCODE_CONFIG`, project/root config,
`.mimocode` config, `MIMOCODE_CONFIG_DIR`, and finally
`MIMOCODE_CONFIG_CONTENT`. Verification must inspect the whole conflict surface,
not only the file written by the installer.

## Provider Shape

The intended managed provider shape is:

```json
{
  "provider": {
    "gonkagate": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "GonkaGate",
      "options": {
        "baseURL": "https://api.gonkagate.com/v1",
        "apiKey": "{file:~/.gonkagate/mimo-code/api-key}",
        "setCacheKey": false
      },
      "models": {
        "<model-id-with-published-context>": {
          "name": "<live catalog name>",
          "limit": {
            "context": "<live catalog context_length>",
            "output": 0
          }
        },
        "<model-id-without-published-context>": {
          "name": "<model id>"
        }
      }
    }
  }
}
```

The concrete `models` object is generated from the live `/v1/models` response.
The API model ids are also the MiMoCode model keys under
`provider.gonkagate.models`. This repository keeps no checked-in model catalog:
ids, display names, and context windows are read from the live response on
every run.

Per-model metadata is optional on the wire, because a GonkaGate gateway may
still return only `id`, `object`, `created`, and `owned_by`:

- missing `name` falls back to the model id
- missing `description` is omitted from the picker
- missing `context_length` writes no `limit` block for that model, so MiMoCode
  keeps its own default instead of being told the context window is `0`

`setCacheKey` is disabled because live GonkaGate chat-completions requests
reject the non-standard `promptCacheKey` parameter emitted by the AI SDK when
cache keys are enabled.

## Non-Goals

- direct `auth.json` mutation
- shell profile mutation
- `.env` generation
- arbitrary base URL overrides in v1
- arbitrary model ids in v1
- claiming `/v1/responses` support before an explicit migration
