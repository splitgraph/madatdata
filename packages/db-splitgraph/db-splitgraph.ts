import { BaseDb, type Plugin } from "@madatdata/base-db";

interface SplitgraphImportPlugin extends Plugin {
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

type SplitgraphDestOptions = {
  tableName: string;
};

interface ImportCSVPlugin {
  importData: (
    sourceOptions: { url: string },
    destOptions: SplitgraphDestOptions
  ) => Promise<{
    response: { success: true } | null;
    error: { success: false } | null;
  }>;
}

// NOTE: In theory this will be auto-generated
type DEFAULT_PLUGINS = "mysql" | "postgres";

type SPECIAL_PLUGINS = {
  csv: ImportCSVPlugin;
};

type SpecialPluginMap = {
  [k in keyof SPECIAL_PLUGINS]: SPECIAL_PLUGINS[k];
};

type DefaultPluginMap = {
  [k in DEFAULT_PLUGINS]: SplitgraphImportPlugin;
};

type SplitgraphImportPluginMap = DefaultPluginMap & SpecialPluginMap;

class DbSplitgraph extends BaseDb<SplitgraphImportPluginMap> {
  importData<PluginName extends keyof SplitgraphImportPluginMap>(
    plugin: PluginName,
    _source: Parameters<SplitgraphImportPluginMap[PluginName]["importData"]>[0],
    _dest: Parameters<SplitgraphImportPluginMap[PluginName]["importData"]>[1]
  ) {
    if (plugin === "csv") {
      return Promise.resolve({
        response: {
          success: true,
        },
        error: null,
      });
    } else {
      return Promise.resolve({
        response: null,
        error: {
          success: false,
        },
      });
    }
  }
}

export const makeDb = () => {
  const db = new DbSplitgraph();
  return db;
};
