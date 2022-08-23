import { BaseDb, type DbOptions } from "@madatdata/base-db";
import type { SplitgraphImportPluginMap } from "./plugins/importers";

// TODO: This sould be injected in the constructor as the actual plugin map
import { ImportCSVPlugin } from "./plugins/importers/import-csv-plugin";

// TODO: It's not ideal for db-splitgraph to depend on base-client
import {
  type Client,
  type ClientOptions,
  makeAuthHeaders,
  defaultHost,
} from "@madatdata/base-client";

import type { Strategies, HTTPClientOptions } from "@madatdata/client-http";

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

export class DbSplitgraph extends BaseDb<Partial<SplitgraphImportPluginMap>> {
  private graphqlEndpoint: string;

  constructor(
    opts: Omit<DbSplitgraphOptions, "plugins"> &
      Pick<Partial<DbSplitgraphOptions>, "plugins">
  ) {
    super({
      ...opts,
      plugins:
        opts.plugins ??
        makeDefaultPluginMap({
          graphqlEndpoint: (opts.host ?? defaultHost).baseUrls.gql,
          makeAuthHeaders: () =>
            this.authenticatedCredential
              ? makeAuthHeaders(this.authenticatedCredential)
              : {},
        }),
    });

    this.graphqlEndpoint = this.host.baseUrls.gql;
  }

  public makeHTTPClient(
    makeClientForProtocol: (wrappedOptions: ClientOptions) => Client,
    clientOptions: ClientOptions & HTTPClientOptions
  ) {
    // FIXME: do we need to depend on all of client-http just for `strategies` type?
    // FIXME: this pattern would probably work better as a user-provided Class
    // nb: careful to keep parity with (intentionally) same code in db-splitgraph.ts
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
            headers: {
              "Content-Type": "application/json",
              ...makeAuthHeaders(
                credential
              ) /* fixme: smell? prefer `this.credential`? */,
            },
            body: JSON.stringify({ sql: query, ...httpExecOptions }),
          };
        },
        makeQueryURL: async ({ host, database }) => {
          return Promise.resolve(host.baseUrls.sql + "/" + database.dbname);
        },
      } as Strategies,
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
        info: null,
      });
    }
  }
}

export const makeDb = (...args: ConstructorParameters<typeof DbSplitgraph>) => {
  const db = new DbSplitgraph(...args);
  return db;
};
