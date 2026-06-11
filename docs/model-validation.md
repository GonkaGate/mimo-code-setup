# Model Validation

The current curated registry has one MiMoCode-validated public model:
`moonshotai/kimi-k2.6`.

Validated entries:

- `moonshotai/kimi-k2.6` - Kimi K2.6, 262K context, recommended default.

Candidate entries are refreshed from the public GonkaGate models page. GonkaGate
availability metadata is not MiMoCode validation proof.

- `minimaxai/minimax-m2.7` - MiniMax M2.7, 205K context.
- `qwen/qwen3-235b-a22b-instruct-2507-fp8` - Qwen3 235B A22B
  Instruct 2507 FP8, 262K context.

Live MiMoCode validation for Kimi uses the full GonkaGate slug as the MiMoCode
model key, so the effective model ref is
`gonkagate/moonshotai/kimi-k2.6`. Short aliases such as
`gonkagate/kimi-k2.6` send the wrong upstream `model_slug`.

The managed provider config sets `provider.gonkagate.options.setCacheKey` to
`false`. Live GonkaGate chat-completions requests reject the non-standard
`promptCacheKey` parameter emitted when AI SDK cache keys are enabled.

Before a model can become public validated runtime behavior, validation must
prove:

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
- docs and tests name the model as validated only after the proof exists

The registry types already allow transport, adapter package, provider options,
model options, model headers, limits, and migration metadata so MiMoCode-specific
requirements can be added without changing the public shape later.

Validation records are represented in `src/constants/model-validation.ts`.
Contract tests reject any registry entry marked `validated` without a matching
record. Additional live GonkaGate proof is a gated validation activity and is
not part of default CI.
