# Changelog

## [0.3.0](https://github.com/GonkaGate/mimo-code-setup/compare/v0.2.0...v0.3.0) (2026-06-11)


### Features

* fetch GonkaGate model catalog from /v1/models ([4b041a6](https://github.com/GonkaGate/mimo-code-setup/commit/4b041a60ed11588acec2357a3953254f140fb4a3))
* fetch GonkaGate model catalog from /v1/models ([44072ba](https://github.com/GonkaGate/mimo-code-setup/commit/44072ba26c942b0213f2f5427c083751c74046a7))

## [0.2.0](https://github.com/GonkaGate/mimo-code-setup/compare/v0.1.0...v0.2.0) (2026-06-11)


### Features

* implement MiMoCode setup runtime ([d974ed4](https://github.com/GonkaGate/mimo-code-setup/commit/d974ed434e1f6a022a305c47d6a2c62bf12db9d2))


### Bug Fixes

* make fake mimo integration Windows-safe ([c37b054](https://github.com/GonkaGate/mimo-code-setup/commit/c37b054f73aff123984c56443fd0766b7f75e069))

## [Unreleased]

### Added

- initial repository scaffold for `@gonkagate/mimo-code-setup`
- PRD for the future GonkaGate MiMoCode setup tool
- package metadata, TypeScript build, CI workflows, release-please config, and
  publish workflow
- CLI entrypoint that runs the installer runtime
- MiMoCode-specific product constants and curated model registry
- mirrored `.agents` and `.claude` skill packs
- contract tests for package metadata, docs, CLI, and mirrored skills
- installer runtime with safe secret intake, managed config writes, rollback,
  redacted verification, and candidate-only custom-registry blocking
- MiMoCode validation for `moonshotai/kimi-k2.6` as the recommended public
  default
- live GonkaGate `/v1/models` catalog fetch after safe API-key intake, with
  every returned model written into `provider.gonkagate.models`

## [0.1.0] - 2026-06-11

### Added

- initial development scaffold
