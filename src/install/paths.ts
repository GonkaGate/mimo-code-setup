import { dirname, isAbsolute, join, parse, resolve } from "node:path";
import {
  CREATED_GLOBAL_CONFIG_FILENAME,
  GLOBAL_CONFIG_FILENAMES,
  PROJECT_CONFIG_PATH,
} from "../constants/gateway.js";
import type { InstallerDeps } from "./deps.js";

export const GLOBAL_CONFIG_MERGE_FILENAMES = [
  "config.json",
  "mimocode.json",
  "mimocode.jsonc",
] as const;

export interface MimoGlobalPaths {
  cacheDir?: string;
  configDir: string;
  dataDir?: string;
  stateDir?: string;
}

export interface GlobalConfigTarget {
  candidatesInMergeOrder: readonly string[];
  configDir: string;
  existingCandidates: readonly string[];
  targetPath: string;
}

export interface ProjectRootResolution {
  discovery: "git" | "cwd";
  projectRoot: string;
}

export interface ProjectConfigLayers {
  configDirLayers: readonly string[];
  disabledProjectConfig: boolean;
  projectConfigTarget: string;
  projectRoot: string;
  rootLayers: readonly string[];
}

export async function resolveMimoGlobalPaths(
  deps: InstallerDeps,
  env: NodeJS.ProcessEnv = deps.env(),
): Promise<MimoGlobalPaths> {
  const debugPaths = await readMimoDebugPaths(deps, env);

  if (debugPaths?.configDir !== undefined) {
    return debugPaths;
  }

  return fallbackMimoGlobalPaths(env);
}

export async function selectGlobalConfigTarget(
  deps: InstallerDeps,
  configDir: string,
): Promise<GlobalConfigTarget> {
  const existingCandidates: string[] = [];

  for (const filename of GLOBAL_CONFIG_FILENAMES) {
    const candidate = join(configDir, filename);
    if (await deps.fs.pathExists(candidate)) {
      existingCandidates.push(candidate);
    }
  }

  const targetPath =
    existingCandidates[0] ?? join(configDir, CREATED_GLOBAL_CONFIG_FILENAME);

  return {
    candidatesInMergeOrder: GLOBAL_CONFIG_MERGE_FILENAMES.map((filename) =>
      join(configDir, filename),
    ),
    configDir,
    existingCandidates,
    targetPath,
  };
}

export async function resolveProjectRoot(
  deps: InstallerDeps,
  start = deps.cwd(),
): Promise<ProjectRootResolution> {
  let current = resolve(start);
  const root = parse(current).root;

  while (true) {
    if (await deps.fs.pathExists(join(current, ".git"))) {
      return {
        discovery: "git",
        projectRoot: current,
      };
    }

    if (current === root) {
      return {
        discovery: "cwd",
        projectRoot: resolve(start),
      };
    }

    current = dirname(current);
  }
}

export function resolveProjectConfigLayers(
  projectRoot: string,
  env: NodeJS.ProcessEnv,
): ProjectConfigLayers {
  const disabledProjectConfig = env.MIMOCODE_DISABLE_PROJECT_CONFIG === "1";
  const rootLayers = disabledProjectConfig
    ? []
    : [
        join(projectRoot, "mimocode.json"),
        join(projectRoot, "mimocode.jsonc"),
        join(projectRoot, ".mimocode", "mimocode.json"),
        join(projectRoot, ".mimocode", "mimocode.jsonc"),
      ];
  const configDirLayers =
    env.MIMOCODE_CONFIG_DIR === undefined
      ? []
      : [
          join(env.MIMOCODE_CONFIG_DIR, "config.json"),
          join(env.MIMOCODE_CONFIG_DIR, "mimocode.json"),
          join(env.MIMOCODE_CONFIG_DIR, "mimocode.jsonc"),
        ];

  return {
    configDirLayers,
    disabledProjectConfig,
    projectConfigTarget: join(projectRoot, PROJECT_CONFIG_PATH),
    projectRoot,
    rootLayers,
  };
}

export function parseMimoDebugPaths(
  stdout: string,
): MimoGlobalPaths | undefined {
  const trimmed = stdout.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    const configDir = getString(parsed.configDir) ?? getString(parsed.config);
    if (configDir !== undefined) {
      return createMimoGlobalPaths({
        cacheDir: getString(parsed.cacheDir) ?? getString(parsed.cache),
        configDir,
        dataDir: getString(parsed.dataDir) ?? getString(parsed.data),
        stateDir: getString(parsed.stateDir) ?? getString(parsed.state),
      });
    }
  } catch {
    // Fall through to text parsing.
  }

  const values = new Map<string, string>();
  for (const line of trimmed.split(/\r?\n/u)) {
    const match = line.match(/^\s*([A-Za-z_ -]+)\s*[:=]\s*(.+?)\s*$/u);
    if (match?.[1] !== undefined && match[2] !== undefined) {
      values.set(match[1].toLowerCase().replaceAll(/[\s_-]/g, ""), match[2]);
    }
  }

  const configDir = values.get("config") ?? values.get("configdir");
  if (configDir === undefined) {
    return undefined;
  }

  return createMimoGlobalPaths({
    cacheDir: values.get("cache") ?? values.get("cachedir"),
    configDir,
    dataDir: values.get("data") ?? values.get("datadir"),
    stateDir: values.get("state") ?? values.get("statedir"),
  });
}

async function readMimoDebugPaths(
  deps: InstallerDeps,
  env: NodeJS.ProcessEnv,
): Promise<MimoGlobalPaths | undefined> {
  const result = await deps.commands.run("mimo", ["debug", "paths"], {
    cwd: deps.cwd(),
    env,
  });

  if (result.exitCode !== 0) {
    return undefined;
  }

  return parseMimoDebugPaths(result.stdout);
}

function fallbackMimoGlobalPaths(env: NodeJS.ProcessEnv): MimoGlobalPaths {
  const home = env.HOME ?? env.USERPROFILE;
  if (home === undefined) {
    throw new Error(
      "Cannot resolve MiMoCode paths without HOME or USERPROFILE.",
    );
  }

  const mimoHome = env.MIMOCODE_HOME;
  if (mimoHome !== undefined && isAbsolute(mimoHome)) {
    return {
      cacheDir: join(mimoHome, "cache"),
      configDir: join(mimoHome, "config"),
      dataDir: join(mimoHome, "data"),
      stateDir: join(mimoHome, "state"),
    };
  }

  const xdgConfigHome = env.XDG_CONFIG_HOME ?? join(home, ".config");
  return {
    cacheDir: join(env.XDG_CACHE_HOME ?? join(home, ".cache"), "mimocode"),
    configDir: join(xdgConfigHome, "mimocode"),
    dataDir: join(
      env.XDG_DATA_HOME ?? join(home, ".local", "share"),
      "mimocode",
    ),
    stateDir: join(
      env.XDG_STATE_HOME ?? join(home, ".local", "state"),
      "mimocode",
    ),
  };
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function createMimoGlobalPaths(input: {
  cacheDir?: string;
  configDir: string;
  dataDir?: string;
  stateDir?: string;
}): MimoGlobalPaths {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as unknown as MimoGlobalPaths;
}
