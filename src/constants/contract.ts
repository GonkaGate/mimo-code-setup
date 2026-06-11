export const CONTRACT_METADATA = {
  binName: "mimo-code-setup",
  legacyBinName: "gonkagate-mimo-code",
  binPath: "bin/gonkagate-mimo-code.js",
  cliVersion: "0.1.0", // x-release-please-version
  curatedRegistryPublished: true,
  packageName: "@gonkagate/mimo-code-setup",
  publicEntrypoint: "npx @gonkagate/mimo-code-setup",
  publicState:
    "Installer runtime is implemented with moonshotai/kimi-k2.6 validated for MiMoCode; additional GonkaGate models remain candidates until gated proof exists.",
  verifiedMimoCode: {
    checkedAt: "2026-06-11",
    minVersion: "0.1.0",
    packageName: "@mimo-ai/cli",
  },
} as const;
