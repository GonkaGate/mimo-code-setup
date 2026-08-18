# Runtime Contract Map

This file maps the scaffold-to-runtime truth flip so implementation work cannot
silently drift away from public docs or contract tests.

## Truth Flip Files

When setup behavior changes from scaffold-only to implemented runtime behavior,
update these surfaces together:

- `AGENTS.md` - repository truth, product/security invariants, implementation
  status, minimum MiMoCode version, supported setup behavior, and validation
  command.
- `README.md` - public status, npm entrypoint, runtime flow, supported flags,
  config targets, live model-catalog behavior, and local development checks.
- `docs/how-it-works.md` - runtime architecture, scope behavior, config-layer
  precedence, verification flow, and migration path.
- `docs/security.md` - safe secret intake, managed storage, redaction, project
  commit-safety, and blocked unsafe override behavior.
- `docs/model-validation.md` - MiMoCode workflow proof ledger, distinct from
  live GonkaGate `/v1/models` catalog availability.
- `docs/troubleshooting.md` - user-facing blocker taxonomy without asking users
  to paste raw `mimo --pure debug config` output.
- `CHANGELOG.md` - meaningful user-facing runtime changes.
- `src/constants/contract.ts` - package identity, public implementation status,
  MiMoCode minimum version, and live catalog source.
- `src/install/model-catalog.ts` - `/v1/models` fetch, response-shape boundary,
  and the fallbacks for gateways that publish no per-model metadata.
- `src/constants/models.ts` - runtime model shape types only; it must not carry
  a checked-in catalog, context window, display name, or default model id.
- `test/docs-contract.test.ts` and `test/package-contract.test.ts` - docs,
  constants, package metadata, and model registry agreement.
- `test/cli.test.ts` - human and JSON CLI output semantics.

## Scaffold Guard

Until a runtime behavior has implementation, tests, docs, and contract truth in
agreement, public docs must not claim shipped setup success. Runtime internals
may exist before public success is possible, but docs must say exactly what can
and cannot complete.

## Runtime Guard

After runtime modules exist, docs must not keep claiming that `src/install/`
does not exist. If the live catalog behavior changes, docs, CLI output, tests,
and package contract metadata must all name the same public setup behavior. If
a model gains MiMoCode-specific workflow validation proof, update
`docs/model-validation.md` and `src/constants/model-validation.ts` together.
