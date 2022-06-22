import { BaseDb, type PluginMap, type DbOptions } from "@madatdata/base-db";
import type { SplitgraphImportPluginMap } from "./plugins/importers";

// TODO: This sould be injected in the constructor as the actual plugin map
import { ImportCSVPlugin } from "./plugins/importers/import-csv-plugin";

// TODO: It's not ideal for db-splitgraph to depend on base-client
import { makeAuthHeaders } from "@madatdata/base-client/";

interface DbSplitgraphOptions extends DbOptions<SplitgraphImportPluginMap> {}

class DbSplitgraph extends BaseDb<SplitgraphImportPluginMap> {
  private graphqlEndpoint: string;

  constructor(opts: DbSplitgraphOptions) {
    super(opts);

    this.graphqlEndpoint = this.host.baseUrls.gql;
  }

  async importData<
    PluginName extends keyof SplitgraphImportPluginMap,
    SourceOpts = Parameters<
      SplitgraphImportPluginMap[PluginName]["importData"]
    >[0],
    DestOpts = Parameters<
      SplitgraphImportPluginMap[PluginName]["importData"]
    >[1]
  >(pluginName: PluginName, source: SourceOpts, dest: DestOpts) {
    if (pluginName === "csv") {
      // const Plugin = ImportCSVPlugin ;

      const plugin = this.plugins["csv"];

      // const plugin = new ImportCSVPlugin({
      //   graphqlEndpoint: this.graphqlEndpoint,
      //   transformRequestHeaders: (reqHeaders) =>
      //     this.authenticatedCredential
      //       ? {
      //           ...reqHeaders,
      //           ...makeAuthHeaders(this.authenticatedCredential),
      //         }
      //       : reqHeaders,
      // }) as SplitgraphImportPluginMap[PluginName];

      return await plugin.importData(source, dest);
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

export const makeDb = (...args: ConstructorParameters<typeof DbSplitgraph>) => {
  const db = new DbSplitgraph(...args);
  return db;
};

type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;
