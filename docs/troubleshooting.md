# Troubleshooting

This repository currently ships an installer runtime with
`moonshotai/kimi-k2.6` validated for MiMoCode. If the CLI reports
`validated_models_unavailable`, the local package or registry is stale or a
custom injected registry contains no validated models.

## Expected Development Checks

```bash
npm install
npm run ci
```

If `npm run package:check` fails, inspect `package.json`, `bin/`, and `dist/`
after running `npm run build`.

## Future Runtime Blockers

The implemented installer should report blockers for:

- missing or unsupported `mimo`
- unsupported MiMoCode config shape
- invalid or unsafe secret input
- `MIMOCODE_CONFIG`, `MIMOCODE_CONFIG_DIR`, or `MIMOCODE_CONFIG_CONTENT`
  conflicts
- project config that tries to own `provider.gonkagate.options.apiKey`
- effective config mismatch after managed writes
- provider allow/deny lists that disable `gonkagate`

Do not ask users to paste raw `mimo --pure debug config` output. It may contain
substituted secret values.
