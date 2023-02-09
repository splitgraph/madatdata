import { BaseDb, type DbOptions, OptionalPluginMap } from "@madatdata/base-db";
import type {
  SplitgraphPluginMap,
  SplitgraphImportPluginMap,
  SplitgraphExportPluginMap,
} from "./plugins/importers";

// TODO: These could be injected in the constructor as the actual plugin map
import { SplitgraphImportCSVPlugin } from "./plugins/importers/splitgraph-import-csv-plugin";
import { ExportQueryPlugin } from "./plugins/exporters/export-query-plugin";

// TODO: It's not ideal for db-splitgraph to depend on base-client
import {
  type Client,
  type ClientOptions,
  type AuthenticatedCredential,
  makeAuthHeaders,
  defaultHost,
} from "@madatdata/base-client";

import type { HTTPStrategies, HTTPClientOptions } from "@madatdata/client-http";
import type { GraphQLClientOptions } from "./plugins";

interface DbSplitgraphOptions
  extends DbOptions<OptionalPluginMap<SplitgraphPluginMap>>,
    Partial<GraphQLClientOptions> {}

const makeTransformRequestHeadersForAuthenticatedRequest =
  (
    maybeAuthenticatedCredential?: AuthenticatedCredential
  ): Required<GraphQLClientOptions>["transformRequestHeaders"] =>
  (reqHeaders) => ({
    ...reqHeaders,
    ...(maybeAuthenticatedCredential
      ? makeAuthHeaders(maybeAuthenticatedCredential)
      : {}),
  });

const makeDefaultPluginMap = (
  opts: Pick<Required<DbSplitgraphOptions>, "graphqlEndpoint"> &
    Pick<Partial<DbSplitgraphOptions>, "authenticatedCredential">
) => {
  const graphqlOptions: GraphQLClientOptions = {
    graphqlEndpoint: opts.graphqlEndpoint,
    transformRequestHeaders: makeTransformRequestHeadersForAuthenticatedRequest(
      opts.authenticatedCredential
    ),
  };

  return {
    importers: {
      csv: new SplitgraphImportCSVPlugin({ ...graphqlOptions }),
      // TODO: not real obviously
      mysql: new SplitgraphImportCSVPlugin({ ...graphqlOptions }),
      postgres: new SplitgraphImportCSVPlugin({ ...graphqlOptions }),
    },
    exporters: {
      exportQuery: new ExportQueryPlugin({ ...graphqlOptions }),
    },
  };
};

export class DbSplitgraph extends BaseDb<
  OptionalPluginMap<SplitgraphPluginMap>
> {
  private graphqlEndpoint: string;

  constructor(
    opts: Omit<DbSplitgraphOptions, "plugins"> &
      Pick<Partial<DbSplitgraphOptions>, "plugins">
  ) {
    const graphqlEndpoint =
      opts.graphqlEndpoint ?? (opts.host ?? defaultHost).baseUrls.gql;
    const plugins =
      opts.plugins ??
      makeDefaultPluginMap({
        graphqlEndpoint,
        authenticatedCredential: opts.authenticatedCredential,
      });

    super({
      ...opts,
      plugins,
    });

    this.graphqlEndpoint = graphqlEndpoint;
  }

  // NOTE: we want this to update when this.authenticatedCredential updates
  private get pluginConfig(): Pick<
    Required<DbSplitgraphOptions>,
    "graphqlEndpoint" | "transformRequestHeaders"
  > {
    return {
      graphqlEndpoint: this.graphqlEndpoint,
      transformRequestHeaders:
        makeTransformRequestHeadersForAuthenticatedRequest(
          this.authenticatedCredential
        ),
    };
  }

  public makeHTTPClient(
    makeClientForProtocol: (wrappedOptions: ClientOptions) => Client,
    clientOptions: ClientOptions & HTTPClientOptions
  ) {
    // FIXME: do we need to depend on all of client-http just for `strategies` type?
    // FIXME: this pattern would probably work better as a user-provided Class
    // nb: careful to keep parity with (intentionally) same code in db-seafowl.ts
    return super.makeClient<HTTPClientOptions>(makeClientForProtocol, {
      ...clientOptions,
      bodyMode: "json",
      strategies: {
        makeFetchOptions: ({ credential, query, execOptions }) => {
          // HACKY: atm, splitgraph API does not accept "object" as valid param
          // so remove it from execOptions (hacky because ideal is `...execOptions`)
          const httpExecOptions =
            execOptions?.rowMode === "object"
              ? (({ rowMode, ...rest }) => rest)(execOptions)
              : execOptions;

          return {
            method: "POST",
            headers: makeTransformRequestHeadersForAuthenticatedRequest(
              credential as AuthenticatedCredential
            )({
              "Content-Type": "application/json",
            }),
            body: JSON.stringify({ sql: query, ...httpExecOptions }),
          };
        },
        makeQueryURL: async ({ host, database }) => {
          return Promise.resolve(host.baseUrls.sql + "/" + database.dbname);
        },
      } as HTTPStrategies,
    });
  }

  // TODO: doesn't belong here (or does it? maybe credential doesn't belong _there_)
  async fetchAccessToken() {
    // TODO: cleanup this proliferating mess (figure out auth...again )
    const credential = this.authenticatedCredential as {
      apiKey?: string;
      apiSecret?: string;
      token?: string;
    } | null;

    if (credential === null) {
      throw new Error(
        "TODO: fetching anonymous access token not currently supported"
      );
    }

    if (credential.token && !credential.apiKey && !credential.apiSecret) {
      console.warn("Skipping fetchAccessToken, since credential.token exists");
      return credential as { token: string; anonymous: false };
    }

    if (!credential.apiKey || !credential.apiSecret) {
      throw new Error("Missing credential.apiKey or credential.apiSecret");
    }

    const { response, error } = await fetch(
      this.host.baseUrls.auth + "/access_token",
      {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: credential.apiKey,
          api_secret: credential.apiSecret,
        }),
      }
    )
      .then((response) =>
        response.ok
          ? response.json()
          : Promise.reject({ response, error: { type: "http-error" } })
      )
      .then((parsedResponse) => ({
        response: parsedResponse,
        error: null,
      }))
      .catch((error) => ({
        response: null,
        error: {
          type: "network-error",
          ...error,
        },
      }));

    if (error) {
      throw error;
    }

    const { success, access_token: accessToken } = response as {
      success: boolean;
      access_token: string;
    };

    if (!accessToken || !success) {
      throw new Error("Failed to fetch accessToken");
    }

    this.setAuthenticatedCredential({ anonymous: false, token: accessToken });

    return {
      token: accessToken,
    };
  }

  async exportData<PluginName extends keyof SplitgraphExportPluginMap>(
    pluginName: PluginName,
    ...rest: Parameters<SplitgraphExportPluginMap[PluginName]["exportData"]>
  ) {
    const [sourceOpts, destOpts] = rest;

    const plugin = this.plugins.exporters[pluginName];
    if (!plugin) {
      throw new Error(`plugin not found: ${pluginName}`);
    }

    return await plugin
      .withOptions({
        ...this.pluginConfig,
        ...plugin,
        transformRequestHeaders: (headers) =>
          plugin.transformRequestHeaders(
            this.pluginConfig.transformRequestHeaders(headers)
          ),
      })
      .exportData(sourceOpts, destOpts);
  }

  async importData<PluginName extends keyof SplitgraphImportPluginMap>(
    pluginName: PluginName,
    ...rest: Parameters<SplitgraphImportPluginMap[PluginName]["importData"]>
  ) {
    const [sourceOpts, destOpts] = rest;

    if (pluginName === "csv" && this.plugins["importers"]["csv"]) {
      const plugin = this.plugins["importers"]["csv"];

      return await plugin
        .withOptions({
          ...this.pluginConfig,
          ...plugin,
          transformRequestHeaders: (headers) =>
            plugin.transformRequestHeaders(
              this.pluginConfig.transformRequestHeaders(headers)
            ),
        })
        .importData(sourceOpts, destOpts);
    } else {
      // const plugin = this.plugins.importers[pluginName];

      return Promise.resolve({
        response: null,
        error: {
          success: false,
        },
        info: null,
      });
    }
  }
}

export const makeDb = (...args: ConstructorParameters<typeof DbSplitgraph>) => {
  const db = new DbSplitgraph(...args);
  return db;
};
