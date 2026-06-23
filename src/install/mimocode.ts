import semver from "semver";
import { CONTRACT_METADATA } from "../constants/contract.js";
import type { InstallerErrorCode, MimoCodeVersionInfo } from "./contracts.js";
import type { InstallerDeps } from "./deps.js";
import { InstallerError } from "./errors.js";

export interface MimoCodeDetection {
  info: MimoCodeVersionInfo;
  warnings: readonly string[];
}

export async function detectMimoCode(
  deps: InstallerDeps,
): Promise<MimoCodeDetection> {
  const result = await runMimoVersion(deps);
  const installedVersion = parseMimoVersion(result.stdout);
  const minVersion = CONTRACT_METADATA.mimoCode.minVersion;

  if (installedVersion === undefined) {
    throw createMimoError(
      "mimocode_version_unparseable",
      "Could not parse MiMoCode version from `mimo --version`.",
      result.stdout,
    );
  }

  if (semver.lt(installedVersion, minVersion)) {
    throw createMimoError(
      "mimocode_version_too_old",
      `MiMoCode ${installedVersion} is older than the supported ${minVersion} minimum.`,
    );
  }

  return {
    info: {
      installedVersion,
      minimumVersion: minVersion,
      packageName: CONTRACT_METADATA.mimoCode.packageName,
      policy: "supported",
    },
    warnings: [],
  };
}

export function parseMimoVersion(output: string): string | undefined {
  const match = output.match(/\b(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)\b/u);
  const version = match?.[1];

  return version !== undefined && semver.valid(version) !== null
    ? version
    : undefined;
}

async function runMimoVersion(deps: InstallerDeps) {
  try {
    const result = await deps.commands.run("mimo", ["--version"], {
      cwd: deps.cwd(),
      env: deps.env(),
    });

    if (result.exitCode !== 0) {
      throw createMimoError(
        "mimocode_not_found",
        "MiMoCode CLI `mimo` was not found or did not run successfully.",
        result.stderr || result.stdout,
      );
    }

    return result;
  } catch (error) {
    if (error instanceof InstallerError) {
      throw error;
    }

    throw createMimoError(
      "mimocode_not_found",
      "MiMoCode CLI `mimo` was not found or did not run successfully.",
      error instanceof Error ? error.message : String(error),
    );
  }
}

function createMimoError(
  code: Extract<
    InstallerErrorCode,
    | "mimocode_not_found"
    | "mimocode_version_unparseable"
    | "mimocode_version_too_old"
  >,
  message: string,
  detail?: string,
): InstallerError {
  return new InstallerError({
    category: code === "mimocode_not_found" ? "detection" : "version",
    code,
    detail,
    message,
  });
}
