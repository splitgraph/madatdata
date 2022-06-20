import { BaseDb, Plugin, ImportPlugin, type PluginMap } from "@madatdata/base-db";

interface SplitgraphPlugin extends Plugin {
  resultShape: {
      success: true;
    };
    errorShape: {
      success: false;
    };
}
interface SplitgraphImportPlugin extends SplitgraphPlugin, Omit<ImportPlugin, keyof SplitgraphPlugin> {
  destOptions: {
    tableName: string;
  };
}

interface ImportCSVPlugin extends SplitgraphImportPlugin {
  sourceOptions: {
    url: string;
  }
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

type SplitgraphPluginMap = DefaultPluginMap & SpecialPluginMap;

type xxx = ExpandRecursively<SplitgraphPluginMap>

type PluginNames = keyof SplitgraphPluginMap;

class DbSplitgraph extends BaseDb<SplitgraphPluginMap> {


  abstract importData<PluginName extends keyof SplitgraphPluginMap>(
    plugin: PluginName,
    source: SplitgraphPluginMap[PluginName]["importData"]["sourceOptions"],
    dest: SplitgraphPluginMap[PluginName]["importData"]["destOptions"]
  ) {


: Promise<{
    response: SplitgraphPluginMap[PluginName]["importData"]["resultShape"] | null;
    error: SplitgraphPluginMap[PluginName]["importData"]["errorShape"] | null;
  }>;

  // }

  // async importData<
  //   PluginName extends PluginNames,
  // >(plugin: PluginName, _source: SourceOptions, _dest: DestOptions) {
    if (plugin === "csv") {
      return Promise.resolve({
        response: {
          success: true,
        } as unknown as SplitgraphPluginMap[PluginName]["importData"]["resultShape"],
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


type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

type ExpandRecursively<T> = T extends object
  ? T extends infer O
    ? { [K in keyof O]: ExpandRecursively<O[K]> }
    : never
  : T;
