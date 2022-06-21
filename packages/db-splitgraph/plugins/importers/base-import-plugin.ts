import type { Plugin } from "@madatdata/base-db";

export type SplitgraphDestOptions = {
  tableName: string;
};

export interface SplitgraphImportPlugin extends Plugin {
  importData: <
    SourceOptions = { otherother: string },
    DestOptions = SplitgraphDestOptions,
    ResultShape = { success: true },
    ErrorShape = { success: false }
  >(
    sourceOptions: SourceOptions,
    destOptions: DestOptions
  ) => Promise<{ response: ResultShape | null; error: ErrorShape | null }>;
}
