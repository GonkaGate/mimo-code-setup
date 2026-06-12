# Security

The runtime fetches public setup choices from GonkaGate `GET /v1/models` after
safe API-key intake. These rules define the security contract for the key,
catalog fetch, managed storage, and diagnostics.

## Secret Intake

Allowed future inputs:

- masked interactive prompt
- `GONKAGATE_API_KEY`
- `--api-key-stdin`

Disallowed inputs:

- plain `--api-key` flag
- command-line args that expose the secret to shell history or process lists
- repository-local config files
- shell profile mutation
- `.env` file generation

## Secret Storage

The managed secret file is:

```text
~/.gonkagate/mimo-code/api-key
```

The canonical MiMoCode binding is:

```text
provider.gonkagate.options.apiKey = {file:~/.gonkagate/mimo-code/api-key}
```

On POSIX platforms, managed secret files and directories must use owner-only
permissions where possible. On native Windows, managed files should stay inside
the current user's profile and rely on per-user ACL inheritance.

## Diagnostics

The runtime must never print:

- the raw `gp-...` key
- raw resolved config from `mimo --pure debug config`
- substituted secret values from `{file:...}` bindings
- secret-bearing request bodies or logs

Diagnostics should report redacted config paths, blocker categories, and
actionable remediation without exposing secret contents.

The `/v1/models` fetch must use the key only in the Authorization header and
must not log request headers, response bodies, or raw upstream diagnostics that
could contain secret-bearing data.

## Config Ownership

The user-level config owns the provider definition and secret binding. Project
scope may write activation settings, but it must not copy the secret binding
into repository-local files.

The installer must block success if higher-precedence durable or inline config
overrides define `provider.gonkagate.options.apiKey`.
