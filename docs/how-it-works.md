# How It Works

`mimo-code-setup` configures MiMoCode to use GonkaGate as a custom provider.
The current repository contains the product contract and installer runtime.
`moonshotai/kimi-k2.6` is the current MiMoCode-validated public default;
additional GonkaGate models remain gated until their own validation records
exist.

## Planned Flow

1. Validate that the local `mimo` CLI is available and compatible with the
   audited MiMoCode baseline.
2. Resolve safe config and state paths without mutating shell profiles or `.env`
   files.
3. Collect a GonkaGate API key through safe inputs only:
   `GONKAGATE_API_KEY`, hidden interactive prompt, or `--api-key-stdin`.
4. Store the secret under `~/.gonkagate/mimo-code/api-key`.
5. Write user-level provider config for `provider.gonkagate`.
6. Write only activation settings for project scope.
7. Verify durable config and current-session effective config without printing
   raw resolved config.

## MiMoCode Surfaces

The PRD is based on the MiMoCode upstream contract observed on 2026-06-11:

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
        "moonshotai/kimi-k2.6": {
          "name": "Kimi K2.6",
          "limit": {
            "context": 262000,
            "output": 0
          }
        }
      }
    }
  }
}
```

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
