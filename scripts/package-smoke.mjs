import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const tempRoot = mkdtempSync(join(tmpdir(), "mimo-code-setup-package-"));

try {
  const packResult = run("npm", [
    "pack",
    "--json",
    "--ignore-scripts",
    "--pack-destination",
    tempRoot,
  ]);
  const [packInfo] = JSON.parse(packResult.stdout);
  const files = packInfo.files.map((file) => file.path).sort();
  const allowedRoots = [
    "bin/",
    "dist/",
    "docs/",
    "README.md",
    "CHANGELOG.md",
    "LICENSE",
    "package.json",
  ];

  for (const file of files) {
    if (!allowedRoots.some((root) => file === root || file.startsWith(root))) {
      throw new Error(`Unexpected packed file: ${file}`);
    }
  }

  const tarball = join(tempRoot, packInfo.filename);
  const installRoot = join(tempRoot, "install");
  mkdirSync(installRoot, { recursive: true });
  run(
    "npm",
    ["install", "--ignore-scripts", "--no-audit", "--fund=false", tarball],
    { cwd: installRoot },
  );

  const fakeBin = join(tempRoot, "fake-bin");
  const fakeMimoConfig = join(tempRoot, "fake-mimo-config");
  mkdirSync(fakeBin, { recursive: true });
  mkdirSync(fakeMimoConfig, { recursive: true });
  const fakeMimoScript = `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args.length === 1 && args[0] === "--version") {
  process.stdout.write("mimo 0.1.0\\n");
  process.exit(0);
}
if (args.join(" ") === "debug paths") {
  process.stdout.write(JSON.stringify({ config: process.env.FAKE_MIMO_CONFIG_DIR }) + "\\n");
  process.exit(0);
}
process.stderr.write("unexpected fake mimo args: " + args.join(" ") + "\\n");
process.exit(1);
`;
  if (process.platform === "win32") {
    const escapedScript = fakeMimoScript
      .replaceAll("\\", "\\\\")
      .replaceAll('"', '\\"')
      .replaceAll("\r", "")
      .replaceAll("\n", "\\n");
    writeFileSync(
      join(fakeBin, "mimo.cmd"),
      `@echo off\r\n"${process.execPath}" -e "${escapedScript}" %*\r\n`,
    );
  } else {
    writeFileSync(join(fakeBin, "mimo"), fakeMimoScript, { mode: 0o755 });
  }

  const binSuffix = process.platform === "win32" ? ".cmd" : "";
  const env = {
    ...process.env,
    FAKE_MIMO_CONFIG_DIR: fakeMimoConfig,
    HOME: join(tempRoot, "home"),
    PATH: `${fakeBin}${delimiter}${process.env.PATH ?? ""}`,
  };
  const primary = run(
    join(installRoot, "node_modules", ".bin", `mimo-code-setup${binSuffix}`),
    ["--yes", "--json"],
    { cwd: installRoot, env, expectedStatus: 1 },
  );
  const legacy = run(
    join(
      installRoot,
      "node_modules",
      ".bin",
      `gonkagate-mimo-code${binSuffix}`,
    ),
    ["--yes", "--json"],
    { cwd: installRoot, env, expectedStatus: 1 },
  );

  const primaryJson = JSON.parse(primary.stdout);
  const legacyJson = JSON.parse(legacy.stdout);
  if (
    primaryJson.status !== "blocked" ||
    primaryJson.errorCode !== "non_interactive_secret_required"
  ) {
    throw new Error("Primary bin did not reach the expected secret gate.");
  }
  if (JSON.stringify(primaryJson) !== JSON.stringify(legacyJson)) {
    throw new Error("Primary and legacy bin outputs diverged.");
  }

  console.log("Package smoke passed.");
} finally {
  rmSync(tempRoot, { force: true, recursive: true });
}

function run(command, args, options = {}) {
  const executable =
    process.platform === "win32" && command === "npm" ? "npm.cmd" : command;
  const useShell =
    process.platform === "win32" && executable.toLowerCase().endsWith(".cmd");
  const result = spawnSync(executable, args, {
    cwd: options.cwd ?? repoRoot,
    encoding: "utf8",
    env: options.env ?? process.env,
    shell: useShell,
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.error) {
    throw result.error;
  }

  const expectedStatus = options.expectedStatus ?? 0;
  if (result.status !== expectedStatus) {
    throw new Error(
      [
        `Command failed: ${executable} ${args.join(" ")}`,
        `status: ${result.status}`,
        `stdout: ${result.stdout}`,
        `stderr: ${result.stderr}`,
      ].join("\n"),
    );
  }

  return result;
}
