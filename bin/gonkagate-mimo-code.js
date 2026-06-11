#!/usr/bin/env node

import process from "node:process";
import { main, renderCliEntrypointError } from "../dist/cli.js";
import { isEntrypointInvocation } from "../dist/entrypoint.js";

export { renderCliEntrypointError };

function handleCliError(error) {
  const renderedError = renderCliEntrypointError(error);

  if (renderedError.stderrText !== undefined) {
    process.stderr.write(renderedError.stderrText);
  }

  process.exitCode = renderedError.exitCode;
}

if (isEntrypointInvocation(import.meta.url)) {
  main().catch(handleCliError);
}
