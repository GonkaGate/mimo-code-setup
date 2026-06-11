import semver from "semver";
import { CONTRACT_METADATA } from "../constants/contract.js";
import type { InstallerErrorCode, MimoCodeVersionInfo } from "./contracts.js";
import type { InstallerDeps } from "./deps.js";
import { InstallerError } from "./errors.js";

export type NewerMimoCodePolicy = "block" | "allow_with_warning";

export interface DetectMimoCodeOptions {
  newerVersionPolicy?: NewerMimoCodePolicy;
}

export interface MimoCodeDetection {
  info: MimoCodeVersionInfo;
  warnings: readonly string[];
}

export async function detectMimoCode(
  deps: InstallerDeps,
  options: DetectMimoCodeOptions = {},
): Promise<MimoCodeDetection> {
  const result = await runMimoVersion(deps);
  const installedVersion = parseMimoVersion(result.stdout);
  const baseline = CONTRACT_METADATA.verifiedMimoCode.minVersion;

  if (installedVersion === undefined) {
    throw createMimoError(
      "mimocode_version_unparseable",
      "Could not parse MiMoCode version from `mimo --version`.",
      result.stdout,
    );
  }

  if (semver.lt(installedVersion, baseline)) {
    throw createMimoError(
      "mimocode_version_too_old",
      `MiMoCode ${installedVersion} is older than the audited ${baseline} baseline.`,
    );
  }

  if (semver.gt(installedVersion, baseline)) {
    const policy = options.newerVersionPolicy ?? "block";

    if (policy === "block") {
      throw createMimoError(
        "mimocode_newer_than_audited",
        `MiMoCode ${installedVersion} is newer than the audited ${baseline} baseline.`,
      );
    }

    return {
      info: {
        auditedBaseline: baseline,
        installedVersion,
        packageName: CONTRACT_METADATA.verifiedMimoCode.packageName,
        policy: "newer_allowed_with_warning",
      },
      warnings: [
        `MiMoCode ${installedVersion} is newer than the audited ${baseline} baseline.`,
      ],
    };
  }

  return {
    info: {
      auditedBaseline: baseline,
      installedVersion,
      packageName: CONTRACT_METADATA.verifiedMimoCode.packageName,
      policy: "audited",
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
    | "mimocode_newer_than_audited"
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
