import type { ScopeWritePlan } from "./scope.js";
import { applyScopeValues } from "./scope.js";

export function renderGlobalConfig(
  contents: string,
  plan: ScopeWritePlan,
): string {
  return applyScopeValues(contents, plan.globalValues);
}

export function renderProjectConfig(
  contents: string,
  plan: ScopeWritePlan,
): string {
  return applyScopeValues(contents, plan.projectValues);
}
