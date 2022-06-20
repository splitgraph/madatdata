import {
  BaseDb,
  type Plugin,
  type ImportDataFunction,
} from "@madatdata/base-db";

interface SplitgraphImportPlugin extends Plugin {
  importData: ImportDataFunction;
}

interface ImportCSVPlugin extends Plugin {
  importData: ImportDataFunction;
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
      }) as ReturnType<SplitgraphImportPluginMap[PluginName]["importData"]>;
    } else {
      return Promise.resolve({
        response: null,
        error: {
          success: false,
        },
      }) as ReturnType<SplitgraphImportPluginMap[PluginName]["importData"]>;
    }
  }
}

export const makeDb = () => {
  const db = new DbSplitgraph();
  return db;
};
