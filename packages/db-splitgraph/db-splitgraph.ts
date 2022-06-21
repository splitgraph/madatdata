import { BaseDb } from "@madatdata/base-db";
import type { SplitgraphImportPluginMap } from "./plugins/importers";

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
