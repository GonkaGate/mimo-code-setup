import { Command } from "commander";
import { CONTRACT_METADATA } from "../constants/contract.js";
import {
  CURRENT_PROVIDER_PACKAGE,
  GONKAGATE_BASE_URL,
  GONKAGATE_PROVIDER_ID,
  MANAGED_SECRET_FILE_REF,
  TARGET_CLI,
} from "../constants/gateway.js";
import type { CliOptions } from "./contracts.js";

function createProgram(): Command {
  const program = new Command();

  program
    .name(CONTRACT_METADATA.binName)
    .description(
      "Configure GonkaGate for MiMoCode with safe config, secret storage, and verification.",
    )
    .version(CONTRACT_METADATA.cliVersion)
    .option("--json", "print the scaffold status as JSON")
    .option(
      "--api-key-stdin",
      "read the GonkaGate API key from stdin when runtime setup is enabled",
    )
    .option("--model <key>", "select a GonkaGate model id from /v1/models")
    .option("--scope <scope>", "select setup scope: user or project")
    .option("--cwd <path>", "resolve project scope from this working directory")
    .option("--yes", "accept safe non-interactive defaults when unambiguous")
    .allowUnknownOption(false)
    .addHelpText(
      "after",
      [
        "",
        `Public entrypoint: ${CONTRACT_METADATA.publicEntrypoint}`,
        `Target CLI: ${TARGET_CLI}`,
        `Provider id: ${GONKAGATE_PROVIDER_ID}`,
        `Base URL: ${GONKAGATE_BASE_URL}`,
        `Provider package: ${CURRENT_PROVIDER_PACKAGE}`,
        `Secret binding: ${MANAGED_SECRET_FILE_REF}`,
        "Safe secret inputs: masked prompt, GONKAGATE_API_KEY, --api-key-stdin",
      ].join("\n"),
    );

  return program;
}

export function parseCliOptions(argv: readonly string[]): CliOptions {
  if (argv.some((arg) => arg === "--api-key" || arg.startsWith("--api-key="))) {
    throw new Error(
      "Plain --api-key is not supported. Use a masked prompt, GONKAGATE_API_KEY, or --api-key-stdin.",
    );
  }

  const program = createProgram();
  program.parse([...argv], { from: "user" });
  const options = program.opts<CliOptions>();

  if (
    options.scope !== undefined &&
    options.scope !== "user" &&
    options.scope !== "project"
  ) {
    throw new Error("Scope must be either user or project.");
  }

  return options;
}
