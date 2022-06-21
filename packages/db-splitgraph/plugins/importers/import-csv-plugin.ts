import type { SplitgraphDestOptions } from "./base-import-plugin";

export interface ImportCSVPlugin {
  importData: (
    sourceOptions: { url: string },
    destOptions: SplitgraphDestOptions
  ) => Promise<{
    response: { success: true } | null;
    error: { success: false } | null;
  }>;
}
