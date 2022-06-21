import type { Plugin } from "@madatdata/base-db";

export type SplitgraphDestOptions = {
  tableName: string;
};

export interface SplitgraphImportPlugin extends Plugin {
  importData: <
    SourceOptions = { otherother: string },
    DestOptions = SplitgraphDestOptions,
    ResultShape = { success: boolean },
    ErrorShape = { success: boolean }
  >(
    sourceOptions: SourceOptions,
    destOptions: DestOptions
  ) => Promise<{ response: ResultShape | null; error: ErrorShape | null }>;
}
