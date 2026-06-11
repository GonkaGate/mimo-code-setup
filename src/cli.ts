import process from "node:process";
import { executeCli } from "./cli/execute.js";
import { parseCliOptions } from "./cli/parse.js";
import { renderCliEntrypointError } from "./cli/render.js";
import type { CliRunOptions, CliRunResult } from "./cli/contracts.js";
import { isEntrypointInvocation } from "./entrypoint.js";

export { renderCliEntrypointError } from "./cli/render.js";

export async function run(
  argv = process.argv.slice(2),
  options: CliRunOptions = {},
): Promise<CliRunResult> {
  const stdout = options.stdout ?? process.stdout;
  const parsedOptions = parseCliOptions(argv);

  return executeCli(parsedOptions, { stdout }, options.deps, options.registry);
}

export async function main(
  argv = process.argv.slice(2),
): Promise<CliRunResult> {
  const result = await run(argv);

  process.exitCode = result.exitCode;

  return result;
}

function handleCliError(error: unknown): void {
  const renderedError = renderCliEntrypointError(error);

  process.stderr.write(renderedError.stderrText);
  process.exitCode = renderedError.exitCode;
}

if (isEntrypointInvocation(import.meta.url)) {
  main().catch(handleCliError);
}
