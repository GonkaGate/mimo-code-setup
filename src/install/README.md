# Installer Runtime Layout

`src/install/` owns the MiMoCode setup runtime. Runtime modules receive all
process, filesystem, command, HTTP, prompt, clock, environment, platform, and
path access through dependency interfaces so tests can run against isolated
fake homes, fake projects, fake GonkaGate catalog responses, and fake `mimo`
binaries.

## Module Responsibilities

- `contracts.ts` - result, blocker, verification, scope, and stable error
  contracts shared by human and JSON output.
- `errors.ts` and `redact.ts` - typed installer errors and redaction helpers
  for every user-facing diagnostic.
- `deps.ts` - production Node dependency adapter and runtime interfaces.
- `context.ts` - input/context normalization before writes.
- `platform-path.ts` - platform and path normalization helpers.
- `model-catalog.ts` - GonkaGate `/v1/models` fetch and response parser.
- `index.ts` - public install orchestration entrypoint. It must not directly
  reach into Node globals or perform unmanaged writes.
