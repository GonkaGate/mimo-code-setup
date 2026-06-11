export type RuntimePlatform = "posix" | "wsl" | "windows";

export function classifyRuntimePlatform(input: {
  platform: NodeJS.Platform;
  release?: string;
  env?: NodeJS.ProcessEnv;
}): RuntimePlatform {
  if (input.platform === "win32") {
    return "windows";
  }

  const release = input.release?.toLowerCase() ?? "";
  const env = input.env ?? {};
  if (release.includes("microsoft") || env.WSL_DISTRO_NAME !== undefined) {
    return "wsl";
  }

  return "posix";
}

export function normalizeExecutableCandidates(
  command: string,
  platform: RuntimePlatform,
): readonly string[] {
  if (platform !== "windows") {
    return [command];
  }

  return command.endsWith(".cmd") || command.endsWith(".exe")
    ? [command]
    : [command, `${command}.cmd`, `${command}.exe`];
}

export function normalizeGitBashWindowsPath(path: string): string {
  const match = path.match(/^\/([A-Za-z])\/(.*)$/u);
  if (match === null) {
    return path;
  }

  const [, drive, rest] = match;
  return `${drive!.toUpperCase()}:\\${rest!.replaceAll("/", "\\")}`;
}

export function isNativeWindowsProfilePath(
  path: string,
  userProfile: string,
): boolean {
  const normalizedPath = normalizeWindowsPath(
    normalizeGitBashWindowsPath(path),
  );
  const normalizedProfile = normalizeWindowsPath(
    normalizeGitBashWindowsPath(userProfile),
  );

  return (
    normalizedPath === normalizedProfile ||
    normalizedPath.startsWith(`${normalizedProfile}\\`)
  );
}

export function normalizeWindowsPath(path: string): string {
  return path.replaceAll("/", "\\").replace(/\\+$/u, "").toLowerCase();
}
