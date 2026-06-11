export const GONKAGATE_PROVIDER_ID = "gonkagate" as const;
export const GONKAGATE_BASE_URL = "https://api.gonkagate.com/v1" as const;
export const CURRENT_TRANSPORT = "chat_completions" as const;
export const FUTURE_TRANSPORT = "responses" as const;
export const CURRENT_PROVIDER_PACKAGE = "@ai-sdk/openai-compatible" as const;
export const FUTURE_PROVIDER_PACKAGE = "@ai-sdk/openai" as const;
export const MANAGED_SECRET_FILE_REF =
  "{file:~/.gonkagate/mimo-code/api-key}" as const;
export const MANAGED_SECRET_PATH = "~/.gonkagate/mimo-code/api-key" as const;
export const DOCUMENTED_GLOBAL_CONFIG_PATH =
  "~/.config/mimocode/mimocode.json" as const;
export const GLOBAL_CONFIG_FILENAMES = [
  "mimocode.jsonc",
  "mimocode.json",
  "config.json",
] as const;
export const CREATED_GLOBAL_CONFIG_FILENAME = "mimocode.jsonc" as const;
export const PROJECT_CONFIG_PATH = ".mimocode/mimocode.json" as const;
export const TARGET_CLI = "mimo" as const;
