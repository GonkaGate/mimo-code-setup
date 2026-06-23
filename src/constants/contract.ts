export const CONTRACT_METADATA = {
  binName: "mimo-code-setup",
  legacyBinName: "gonkagate-mimo-code",
  binPath: "bin/gonkagate-mimo-code.js",
  cliVersion: "0.3.3", // x-release-please-version
  curatedRegistryPublished: true,
  packageName: "@gonkagate/mimo-code-setup",
  publicEntrypoint: "npx @gonkagate/mimo-code-setup",
  publicState:
    "Installer runtime fetches the available GonkaGate model catalog from /v1/models after safe API-key intake.",
  mimoCode: {
    minVersion: "0.1.0",
    packageName: "@mimo-ai/cli",
  },
} as const;
