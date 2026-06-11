import type { CuratedModelTransport } from "../constants/models.js";

export type InstallScope = "user" | "project";
export type InstallerStatus = "success" | "blocked" | "failed";
export type VerificationStatus = "passed" | "blocked" | "failed" | "skipped";

export interface MimoCodeVersionInfo {
  auditedBaseline: string;
  installedVersion: string;
  packageName: string;
  policy: "audited" | "newer_blocked" | "newer_allowed_with_warning";
}

export interface ConfigTargets {
  globalConfigPath: string;
  globalConfigCandidates: readonly string[];
  managedSecretPath: string;
  projectConfigPath?: string;
  statePath: string;
}

export interface VerificationSummary {
  durable: VerificationStatus;
  currentSession: VerificationStatus;
  modelVisibility: VerificationStatus;
  provenance: VerificationStatus;
}

export interface InstallerBlocker {
  code: InstallerErrorCode;
  message: string;
  source:
    | "cli"
    | "mimocode"
    | "secret"
    | "storage"
    | "config"
    | "verification"
    | "model_registry"
    | "current_session";
  detail?: string;
}

export interface InstallerSuccessResult {
  ok: true;
  status: "success";
  model: string;
  modelRef: `gonkagate/${string}`;
  scope: InstallScope;
  provider: "gonkagate";
  transport: CuratedModelTransport;
  mimoCode: MimoCodeVersionInfo;
  configTargets: ConfigTargets;
  verification: VerificationSummary;
  nextCommand: "mimo";
  warnings: readonly string[];
}

export interface InstallerBlockedResult {
  ok: false;
  status: "blocked";
  errorCode: InstallerErrorCode;
  message: string;
  blockers: readonly InstallerBlocker[];
  model?: string;
  scope?: InstallScope;
  provider: "gonkagate";
  configTargets?: Partial<ConfigTargets>;
  verification?: Partial<VerificationSummary>;
}

export interface InstallerFailedResult {
  ok: false;
  status: "failed";
  errorCode: InstallerErrorCode;
  message: string;
  blockers: readonly InstallerBlocker[];
  provider: "gonkagate";
}

export type InstallerResult =
  | InstallerSuccessResult
  | InstallerBlockedResult
  | InstallerFailedResult;

export type InstallerErrorCategory =
  | "detection"
  | "version"
  | "secret_intake"
  | "config_parse"
  | "config_write"
  | "rollback"
  | "effective_config"
  | "model_visibility"
  | "blocker_attribution"
  | "model_registry"
  | "unexpected";

export type InstallerErrorCode =
  | "mimocode_not_found"
  | "mimocode_version_unparseable"
  | "mimocode_version_too_old"
  | "mimocode_newer_than_audited"
  | "unsafe_api_key_flag"
  | "missing_api_key"
  | "invalid_api_key"
  | "non_interactive_secret_required"
  | "config_parse_failed"
  | "config_write_failed"
  | "rollback_failed"
  | "secret_storage_failed"
  | "secret_provenance_failed"
  | "effective_config_mismatch"
  | "effective_config_parse_failed"
  | "model_visibility_failed"
  | "provider_disabled"
  | "provider_not_enabled"
  | "model_not_whitelisted"
  | "model_blacklisted"
  | "runtime_override_conflict"
  | "project_secret_binding_forbidden"
  | "validated_models_unavailable"
  | "unsupported_model"
  | "ambiguous_model_selection"
  | "unexpected_error";

export interface InstallerErrorShape {
  category: InstallerErrorCategory;
  code: InstallerErrorCode;
  message: string;
  detail?: string;
}
