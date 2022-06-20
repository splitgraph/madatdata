import { BaseDb, helloWorld } from "@madatdata/base-db";

type CSVPlugin = {
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

type SplitgraphPluginMap = {
  csv: CSVPlugin;
};

class DbSplitgraph extends BaseDb<SplitgraphPluginMap> {
  async importData<
    PluginName extends keyof SplitgraphPluginMap,
    SourceOptions = SplitgraphPluginMap[PluginName]["sourceOptions"],
    DestOptions = SplitgraphPluginMap[PluginName]["destOptions"],
    ImportResultShape = SplitgraphPluginMap[PluginName]["resultShape"],
    ImportErrorShape = SplitgraphPluginMap[PluginName]["errorShape"]
  >(plugin: PluginName, source: SourceOptions, dest: DestOptions) {
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
  return {
    dbname: "ddn",
    helloWorld,
  };
};
