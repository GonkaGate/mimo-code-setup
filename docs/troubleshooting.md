# Troubleshooting

This repository currently ships an installer runtime that asks for a safe
GonkaGate API-key input, fetches `GET /v1/models`, and builds the setup picker
from every returned model id. If the CLI reports `model_catalog_fetch_failed`,
check network access and GonkaGate API availability. If it reports
`model_catalog_empty`, the key was accepted but the catalog returned no models.

## Expected Development Checks

```bash
npm install
npm run ci
```

If `npm run package:check` fails, inspect `package.json`, `bin/`, and `dist/`
after running `npm run build`.

## Managed Storage Blockers

If setup reports `secret_storage_failed` with
`Managed secret and state files must not be repository-local.`, check the
launch environment. `HOME` on POSIX/WSL or `USERPROFILE` on native Windows must
point to the user's real profile directory, not to the current repository. The
installer intentionally stops instead of writing the GonkaGate API key or
install state into a project-local path.

## Future Runtime Blockers

The implemented installer should report blockers for:

- missing or unsupported `mimo`
- unsupported MiMoCode config shape
- invalid or unsafe secret input
- failed or malformed GonkaGate `/v1/models` catalog fetch
- `MIMOCODE_CONFIG`, `MIMOCODE_CONFIG_DIR`, or `MIMOCODE_CONFIG_CONTENT`
  conflicts
- project config that tries to own `provider.gonkagate.options.apiKey`
- effective config mismatch after managed writes
- provider allow/deny lists that disable `gonkagate`

Do not ask users to paste raw `mimo --pure debug config` output. It may contain
substituted secret values.
