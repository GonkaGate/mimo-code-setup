import { join } from "node:path";
import {
  createCuratedModelIndex,
  formatMimoCodeModelRef,
  type CuratedModelRegistry,
} from "../constants/models.js";
import { GONKAGATE_PROVIDER_ID } from "../constants/gateway.js";
import type { InstallerBlocker, InstallerResult } from "./contracts.js";
import type { InstallerDeps } from "./deps.js";
import { toInstallerError } from "./errors.js";
import { detectMimoCode } from "./mimocode.js";
import { fetchGonkaGateModelCatalog } from "./model-catalog.js";
import { resolveManagedHomeDir, resolveManagedPaths } from "./managed-files.js";
import {
  resolveMimoGlobalPaths,
  resolveProjectRoot,
  selectGlobalConfigTarget,
} from "./paths.js";
import { collectGonkaGateApiKey } from "./secrets.js";
import { selectScope, selectValidatedModel } from "./selection.js";
import { createScopeWritePlan } from "./scope.js";
import {
  renderGlobalConfig,
  renderProjectConfig,
} from "./write-target-config.js";
import { ManagedWriteTransaction } from "./managed-write-transaction.js";
import { writeManagedSecret } from "./storage.js";
import { verifySecretProvenance } from "./verify-provenance.js";
import {
  verifyCurrentSessionEffectiveConfig,
  verifyDurableEffectiveConfig,
} from "./verify-effective.js";
import { verifyModelVisibility } from "./verify-models.js";
import { detectCurrentSessionOverrideBlockers } from "./verify-layers.js";
import { createInstallState, writeInstallState } from "./state.js";

export interface InstallSessionRequest {
  apiKeyStdin?: boolean;
  cwd?: string;
  modelKey?: string;
  registry?: CuratedModelRegistry;
  scope?: "user" | "project";
  yes?: boolean;
}

export async function runInstallSession(
  request: InstallSessionRequest,
  deps: InstallerDeps,
): Promise<InstallerResult> {
  const effectiveDeps =
    request.cwd === undefined ? deps : { ...deps, cwd: () => request.cwd! };

  try {
    const mimo = await detectMimoCode(effectiveDeps, {
      newerVersionPolicy: "block",
    });
    const paths = await resolveMimoGlobalPaths(effectiveDeps);
    const target = await selectGlobalConfigTarget(
      effectiveDeps,
      paths.configDir,
    );
    const project = await resolveProjectRoot(
      effectiveDeps,
      effectiveDeps.cwd(),
    );
    const homeDir = resolveManagedHomeDir(effectiveDeps.env());
    const managedPaths = resolveManagedPaths(homeDir);
    const secret = await collectGonkaGateApiKey(
      { apiKeyStdin: request.apiKeyStdin },
      effectiveDeps,
    );
    const registry =
      request.registry ??
      (await fetchGonkaGateModelCatalog(effectiveDeps, secret.key));
    const modelSelection = await selectValidatedModel(
      request,
      effectiveDeps,
      registry,
    );
    const scope = await selectScope(request.scope, effectiveDeps, request.yes);
    const transaction = new ManagedWriteTransaction(effectiveDeps);
    const plan = createScopeWritePlan({
      modelKey: modelSelection.model.key,
      registry,
      scope,
    });

    await writeManagedSecret(effectiveDeps, secret.key, {
      homeDir,
      platform: effectiveDeps.platform === "win32" ? "windows" : "posix",
      projectRoot: project.projectRoot,
      userProfile: effectiveDeps.env().USERPROFILE,
    });

    const existingGlobal = (await effectiveDeps.fs.pathExists(
      target.targetPath,
    ))
      ? await effectiveDeps.fs.readText(target.targetPath)
      : "{}\n";
    const nextGlobal = renderGlobalConfig(existingGlobal, plan);
    await transaction.write({
      backupRoot: managedPaths.backupRoot,
      contents: nextGlobal,
      targetPath: target.targetPath,
      timestamp: effectiveDeps.clock.now(),
    });

    let projectConfigPath: string | undefined;
    let nextProject = "";
    if (scope === "project") {
      projectConfigPath = join(
        project.projectRoot,
        ".mimocode",
        "mimocode.json",
      );
      const existingProject = (await effectiveDeps.fs.pathExists(
        projectConfigPath,
      ))
        ? await effectiveDeps.fs.readText(projectConfigPath)
        : "{}\n";
      nextProject = renderProjectConfig(existingProject, plan);
      await transaction.write({
        backupRoot: managedPaths.backupRoot,
        contents: nextProject,
        projectScoped: true,
        targetPath: projectConfigPath,
        timestamp: effectiveDeps.clock.now(),
      });
    }

    const validatedModelKeys =
      createCuratedModelIndex(registry).validatedModelKeys;
    const durableEffective = await verifyDurableEffectiveConfig(effectiveDeps, {
      modelKey: modelSelection.model.key,
      validatedModelKeys,
    });
    const durableBlockers: InstallerBlocker[] = [
      ...(await verifySecretProvenance(effectiveDeps, {
        globalConfigContents: nextGlobal,
        key: secret.key,
        platform: effectiveDeps.platform === "win32" ? "windows" : "posix",
        ...(scope === "project" ? { projectConfigContents: nextProject } : {}),
        secretPath: managedPaths.secretPath,
      })),
      ...durableEffective.blockers,
      ...(await verifyModelVisibility(effectiveDeps, modelSelection.model.key)),
    ];

    if (durableBlockers.length > 0) {
      await transaction.rollback();
      return {
        blockers: durableBlockers,
        errorCode: durableBlockers[0]?.code ?? "effective_config_mismatch",
        message:
          "MiMoCode setup failed durable verification and managed writes were rolled back.",
        ok: false,
        provider: GONKAGATE_PROVIDER_ID,
        status: "failed",
      };
    }

    await writeInstallState(
      effectiveDeps,
      managedPaths.statePath,
      createInstallState({
        globalConfigTarget: target.targetPath,
        lastDurableSetupAt: effectiveDeps.clock.now().toISOString(),
        mimoCodeVersion: mimo.info.installedVersion,
        ...(projectConfigPath === undefined
          ? {}
          : { projectConfigTarget: projectConfigPath }),
        scope,
        selectedModelKey: modelSelection.model.key,
      }),
    );

    const current = await verifyCurrentSessionEffectiveConfig(effectiveDeps, {
      modelKey: modelSelection.model.key,
      validatedModelKeys,
    });
    const currentBlockers = [
      ...current.blockers,
      ...detectCurrentSessionOverrideBlockers({
        env: effectiveDeps.env(),
        projectScope: scope === "project",
        resolvedMatchesDurable: current.blockers.length === 0,
      }),
    ];

    if (currentBlockers.length > 0) {
      return {
        blockers: currentBlockers,
        configTargets: {
          globalConfigPath: target.targetPath,
          managedSecretPath: managedPaths.secretPath,
          ...(projectConfigPath === undefined ? {} : { projectConfigPath }),
          statePath: managedPaths.statePath,
        },
        errorCode: currentBlockers[0]?.code ?? "runtime_override_conflict",
        message:
          "Durable setup passed, but the current shell session is blocked by active MiMoCode overrides.",
        model: modelSelection.model.key,
        ok: false,
        provider: GONKAGATE_PROVIDER_ID,
        scope,
        status: "blocked",
        verification: {
          currentSession: "blocked",
          durable: "passed",
          modelVisibility: "passed",
          provenance: "passed",
        },
      };
    }

    return {
      configTargets: {
        globalConfigCandidates: target.candidatesInMergeOrder,
        globalConfigPath: target.targetPath,
        managedSecretPath: managedPaths.secretPath,
        ...(projectConfigPath === undefined ? {} : { projectConfigPath }),
        statePath: managedPaths.statePath,
      },
      mimoCode: mimo.info,
      model: modelSelection.model.key,
      modelRef: formatMimoCodeModelRef(modelSelection.model.key),
      nextCommand: "mimo",
      ok: true,
      provider: GONKAGATE_PROVIDER_ID,
      scope,
      status: "success",
      transport: modelSelection.model.transport,
      verification: {
        currentSession: "passed",
        durable: "passed",
        modelVisibility: "passed",
        provenance: "passed",
      },
      warnings: mimo.warnings,
    };
  } catch (error) {
    const installerError = toInstallerError(error);
    return {
      blockers: [
        {
          code: installerError.code,
          detail: installerError.detail,
          message: installerError.message,
          source:
            installerError.category === "model_registry"
              ? "model_registry"
              : installerError.category === "secret_intake"
                ? "secret"
                : installerError.category === "storage"
                  ? "storage"
                  : "cli",
        },
      ],
      errorCode: installerError.code,
      message: installerError.message,
      ok: false,
      provider: GONKAGATE_PROVIDER_ID,
      status: installerError.category === "unexpected" ? "failed" : "blocked",
    };
  }
}
