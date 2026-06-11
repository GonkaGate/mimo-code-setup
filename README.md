# GonkaGate MiMoCode Setup

`mimo-code-setup` is the public open-source onboarding repository for a CLI
that configures local MiMoCode to use GonkaGate as a custom OpenAI-compatible
provider.

Planned public flow:

```bash
npx @gonkagate/mimo-code-setup
```

Current honest state:

- the product PRD is written in `docs/specs/mimo-code-setup-prd/spec.md`
- the npm package scaffold, TypeScript build, CI, release workflows, mirrored
  skills, and contract tests are present
- the public CLI entrypoint calls the installer runtime
- the runtime under `src/install/` contains contracts, dependency adapters,
  managed writes, rollback, redaction, and verification helpers
- `moonshotai/kimi-k2.6` is MiMoCode-validated for the current
  `@mimo-ai/cli` `0.1.0` baseline and is the recommended public default
- remaining curated model entries are candidates until MiMoCode-specific
  validation is completed

## Product Contract

The future installer is intended to configure the `mimo` CLI from
`@mimo-ai/cli` with:

- provider id: `gonkagate`
- base URL: `https://api.gonkagate.com/v1`
- current provider package: `@ai-sdk/openai-compatible`
- current transport: `chat_completions`
- future migration target: `responses`
- managed secret binding:
  `provider.gonkagate.options.apiKey = {file:~/.gonkagate/mimo-code/api-key}`
- live-compatible cache-key setting:
  `provider.gonkagate.options.setCacheKey = false`

The installer must never write secrets into repository-local MiMoCode config.
Project scope should activate GonkaGate without owning the provider definition
or secret binding.

## Development

```bash
npm install
npm run ci
```

Useful commands:

```bash
npm run typecheck
npm run test
npm run format:check
npm run package:check
```

Run the CLI locally:

```bash
npm run build
node bin/gonkagate-mimo-code.js --json
```

## Repository Layout

```text
.
├── AGENTS.md
├── README.md
├── CHANGELOG.md
├── docs/
│   ├── how-it-works.md
│   ├── model-validation.md
│   ├── security.md
│   ├── troubleshooting.md
│   └── specs/mimo-code-setup-prd/spec.md
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

## Status

This repository has the installer runtime implemented with one validated public
MiMoCode model. Additional GonkaGate models remain gated until their own
MiMoCode validation records exist.
