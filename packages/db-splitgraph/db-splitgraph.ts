import { BaseDb } from "@madatdata/base-db";

type CSVPlugin = {
  importData: {
    sourceOptions: {
      url: string;
    };
    destOptions: {
      tableName: string;
    };
    resultShape: {
      success: true;
    };
    errorShape: {
      success: false;
    };
  };
};

// NOTE: In theory this will be auto-generated
type SplitgraphPluginMap = {
  csv: CSVPlugin;
};

class DbSplitgraph extends BaseDb<SplitgraphPluginMap> {
  async importData<
    PluginName extends keyof SplitgraphPluginMap,
    SourceOptions = SplitgraphPluginMap[PluginName]["importData"]["sourceOptions"],
    DestOptions = SplitgraphPluginMap[PluginName]["importData"]["destOptions"],
    ImportResultShape = SplitgraphPluginMap[PluginName]["importData"]["resultShape"],
    ImportErrorShape = SplitgraphPluginMap[PluginName]["importData"]["errorShape"]
  >(plugin: PluginName, _source: SourceOptions, _dest: DestOptions) {
    if (plugin === "csv") {
      return Promise.resolve({
        response: {
          success: true,
        } as unknown as ImportResultShape,
        error: null,
      });
    } else {
      return Promise.resolve({
        response: null,
        error: {
          success: false,
        } as unknown as ImportErrorShape,
      });
    }
  }
}

export const makeDb = () => {
  const db = new DbSplitgraph();
  return db;
};
