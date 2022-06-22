import { BaseDb, type DbOptions } from "@madatdata/base-db";
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

  async importData<PluginName extends keyof SplitgraphImportPluginMap>(
    pluginName: PluginName,
    ...rest: Parameters<SplitgraphImportPluginMap[PluginName]["importData"]>
  ) {
    if (pluginName === "csv") {
      // const plugin = this.plugins["csv"];

      const plugin = new ImportCSVPlugin({
        graphqlEndpoint: this.graphqlEndpoint,
        transformRequestHeaders: (reqHeaders) =>
          this.authenticatedCredential
            ? {
                ...reqHeaders,
                ...makeAuthHeaders(this.authenticatedCredential),
              }
            : reqHeaders,
      }) as SplitgraphImportPluginMap[PluginName];

      return await plugin.importData(rest[0], rest[1]);
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
