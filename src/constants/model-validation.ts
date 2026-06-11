export interface ModelValidationRecord {
  configLayerPrecedence: boolean;
  debugConfigProof: boolean;
  fileEditLoop: boolean;
  modelKey: string;
  modelSwitching: boolean;
  mimoModelsProof: boolean;
  mimoRun: boolean;
  multiTurnContinuation: boolean;
  projectScope: boolean;
  providerPackage: string;
  smallModel: boolean;
  streamingText: boolean;
  toolCalling: boolean;
  transport: "chat_completions" | "responses";
  tuiStartup: boolean;
  userScope: boolean;
}

export const MODEL_VALIDATION_RECORDS = Object.freeze({
  "moonshotai/kimi-k2.6": {
    configLayerPrecedence: true,
    debugConfigProof: true,
    fileEditLoop: true,
    modelKey: "moonshotai/kimi-k2.6",
    modelSwitching: true,
    mimoModelsProof: true,
    mimoRun: true,
    multiTurnContinuation: true,
    projectScope: true,
    providerPackage: "@ai-sdk/openai-compatible",
    smallModel: true,
    streamingText: true,
    toolCalling: true,
    transport: "chat_completions",
    tuiStartup: true,
    userScope: true,
  },
}) satisfies Readonly<Record<string, ModelValidationRecord>>;
