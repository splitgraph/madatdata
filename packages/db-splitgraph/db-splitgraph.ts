import { BaseDb, DbPlugin } from "@madatdata/base-db";

interface SplitgraphPlugin extends DbPlugin {
  importData: {
    sourceOptions: DbPlugin["importData"]["sourceOptions"];
    destOptions: {
      tableName: string;
      tag?: string;
    };
    resultShape: {
      success: true;
    };
    errorShape: {
      success: false;
    };
  };
}

interface CSVPlugin extends SplitgraphPlugin {
  importData: {
    sourceOptions: {
      /** URL of the csv file */
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
}

// NOTE: In theory this will be auto-generated
type DEFAULT_PLUGINS = "mysql" | "postgres";

type SPECIAL_PLUGINS = {
  csv: CSVPlugin;
};

type SpecialPluginMap = {
  [k in keyof SPECIAL_PLUGINS]: SPECIAL_PLUGINS[k];
};

type DefaultPluginMap = {
  [k in DEFAULT_PLUGINS]: SplitgraphPlugin;
};

type SplitgraphPluginMap = DefaultPluginMap & SpecialPluginMap;

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
