import type { CliOptions, CliRunResult } from "./contracts.js";
import type { CuratedModelRegistry } from "../constants/models.js";
import type { InstallerDeps } from "../install/deps.js";
import { runInstaller } from "../install/index.js";
import { renderInstallerJson, renderInstallerText } from "./render.js";

export async function executeCli(
  parsedOptions: CliOptions,
  streams: { stdout: Pick<NodeJS.WriteStream, "write"> },
  deps?: InstallerDeps,
  registry?: CuratedModelRegistry,
): Promise<CliRunResult> {
  const result = await runInstaller(
    {
      apiKeyStdin: parsedOptions.apiKeyStdin,
      cwd: parsedOptions.cwd,
      json: parsedOptions.json,
      modelKey: parsedOptions.model,
      registry,
      scope: parsedOptions.scope,
      yes: parsedOptions.yes,
    },
    deps,
  );

  streams.stdout.write(
    parsedOptions.json === true
      ? renderInstallerJson(result)
      : renderInstallerText(result),
  );

  if (result.status === "success") {
    return {
      exitCode: 0,
      status: "success",
    };
  }

  return {
    exitCode: 1,
    status: result.status,
  };
}
