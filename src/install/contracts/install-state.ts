import type { InstallScope } from "../contracts.js";
import type { CuratedModelTransport } from "../../constants/models.js";

export interface InstallState {
  globalConfigTarget: string;
  installerVersion: string;
  lastDurableSetupAt: string;
  mimoCodeMinimumVersion: string;
  mimoCodeVersion: string;
  previousManagedModelRef?: string;
  projectConfigTarget?: string;
  providerPackage: string;
  scope: InstallScope;
  selectedModelKey: string;
  transport: CuratedModelTransport;
}
