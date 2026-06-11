# Docs

This directory contains the product and contributor-facing documentation for
`@gonkagate/mimo-code-setup`.

- `specs/mimo-code-setup-prd/spec.md` is the product source of truth.
- `how-it-works.md` summarizes the installer architecture.
- `security.md` defines the secret-handling and config-ownership contract.
- `model-validation.md` tracks MiMoCode workflow proof separately from live
  `/v1/models` catalog availability.
- `troubleshooting.md` lists expected blocker classes and safe diagnostics.

The repository currently has an installer runtime. Keep docs aligned with the
implemented flow when editing setup behavior.
