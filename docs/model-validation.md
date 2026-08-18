# Model Validation

The runtime setup picker is populated from GonkaGate `GET /v1/models` after
safe API-key intake. This document is not the public picker allowlist; it is
the MiMoCode workflow proof ledger.

Current MiMoCode-validated workflow proof exists for:

- `moonshotai/kimi-k2.6`, recorded in `src/constants/model-validation.ts`.

Which models exist, what they are called, and how large their context windows
are is owned by the live `GET /v1/models` response. This repository keeps no
copy of that catalog, so nothing here has to be edited when GonkaGate adds,
renames, or retires a model. A model is named in this document because
MiMoCode workflow proof exists for it, not because it is available.

GonkaGate `/v1/models` availability is setup-catalog proof, not full MiMoCode
workflow validation proof.

Live MiMoCode validation for Kimi uses the full GonkaGate slug as the MiMoCode
model key, so the effective model ref is
`gonkagate/moonshotai/kimi-k2.6`. Short aliases such as
`gonkagate/kimi-k2.6` send the wrong upstream `model_slug`.

The managed provider config sets `provider.gonkagate.options.setCacheKey` to
`false`. Live GonkaGate chat-completions requests reject the non-standard
`promptCacheKey` parameter emitted when AI SDK cache keys are enabled.

Before a model can be documented as MiMoCode workflow-validated, validation
must prove:

- MiMoCode TUI startup with the selected model active
- `mimo run` with the selected model
- streaming text responses
- tool calling
- file edit loops
- multi-turn continuation
- `small_model` behavior
- provider/model switching through the MiMoCode picker
- user-scope setup
- project-scope setup
- MiMoCode loads the generated `provider.gonkagate.models` entry
- `mimo models gonkagate` can see the model
- `mimo --pure debug config` effective-config proof
- config-layer precedence for global config, `MIMOCODE_CONFIG`, project config,
  `.mimocode` config, `MIMOCODE_CONFIG_DIR`, and
  `MIMOCODE_CONFIG_CONTENT`
- a dry or fixture-backed chat path uses `@ai-sdk/openai-compatible`
- effective config verification detects wrong base URL, wrong transport, and
  provider gating blockers
- docs and tests name the model as MiMoCode workflow-validated only after the
  proof exists

The runtime model types in `src/constants/models.ts` already allow transport,
adapter package, provider options, model options, model headers, limits, and
migration metadata so MiMoCode-specific requirements can be added without
changing the public shape later. Those types carry no model data; every value
is filled in from the live catalog at setup time.

Validation records are represented in `src/constants/model-validation.ts`.
Contract tests check that each record is internally consistent with the
provider package and transport this installer writes. A record may only be
added after the proof above actually exists; live GonkaGate workflow proof is a
gated validation activity and is not part of default CI.
