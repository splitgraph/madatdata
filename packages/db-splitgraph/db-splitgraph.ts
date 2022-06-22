import { BaseDb, type DbOptions } from "@madatdata/base-db";
import type { SplitgraphImportPluginMap } from "./plugins/importers";

// TODO: This sould be injected in the constructor as the actual plugin map
import { ImportCSVPlugin } from "./plugins/importers/import-csv-plugin";

// TODO: It's not ideal for db-splitgraph to depend on base-client
import { makeAuthHeaders } from "@madatdata/base-client/";

interface DbSplitgraphOptions
  extends DbOptions<Partial<SplitgraphImportPluginMap>> {}

const makeDefaultPluginMap = (opts: {
  graphqlEndpoint: string;
  makeAuthHeaders: () => HeadersInit;
}) => ({
  csv: new ImportCSVPlugin({
    graphqlEndpoint: opts.graphqlEndpoint,
    transformRequestHeaders: (reqHeaders) =>
      opts.makeAuthHeaders
        ? {
            ...reqHeaders,
            ...opts.makeAuthHeaders(),
          }
        : reqHeaders,
  }),
});

class DbSplitgraph extends BaseDb<Partial<SplitgraphImportPluginMap>> {
  private graphqlEndpoint: string;

  constructor(
    opts: Omit<DbSplitgraphOptions, "plugins"> &
      Pick<Partial<DbSplitgraphOptions>, "plugins">
  ) {
    super({
      plugins:
        opts.plugins ??
        makeDefaultPluginMap({
          graphqlEndpoint: "unknown",
          makeAuthHeaders: () =>
            this.authenticatedCredential
              ? makeAuthHeaders(this.authenticatedCredential)
              : {},
        }),
      ...opts,
    });

    this.graphqlEndpoint = this.host.baseUrls.gql;
  }

  async importData<PluginName extends keyof SplitgraphImportPluginMap>(
    pluginName: PluginName,
    ...rest: Parameters<SplitgraphImportPluginMap[PluginName]["importData"]>
  ) {
    const [sourceOpts, destOpts] = rest;

    if (pluginName === "csv" && this.plugins["csv"]) {
      const plugin = this.plugins["csv"];

      return await plugin
        .withOptions({
          graphqlEndpoint: plugin.graphqlEndpoint ?? this.graphqlEndpoint,
          transformRequestHeaders: (reqHeaders) =>
            this.authenticatedCredential
              ? {
                  ...reqHeaders,
                  ...makeAuthHeaders(this.authenticatedCredential),
                }
              : reqHeaders,
        })
        .importData(sourceOpts, destOpts);
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
