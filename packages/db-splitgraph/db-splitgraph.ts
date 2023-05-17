import {
  BaseDb,
  type DbOptions,
  type DbPluggableInterface,
  type WithPluginRegistry,
  type ImportPlugin,
  type ExportPlugin,
  type PluginList,
  type ExtractPlugin,
  type WithOptionsInterface,
} from "@madatdata/base-db";

// TODO: These could be injected in the constructor as the actual plugin map
import { SplitgraphImportCSVPlugin } from "./plugins/importers/splitgraph-import-csv-plugin";
import { SplitgraphExportQueryToFilePlugin } from "./plugins/exporters/splitgraph-export-query-to-file-plugin";

// TODO: It's not ideal for db-splitgraph to depend on base-client
import {
  type Client,
  type ClientOptions,
  type AuthenticatedCredential,
  makeAuthHeaders,
  defaultHost,
} from "@madatdata/base-client";

import type { HTTPStrategies, HTTPClientOptions } from "@madatdata/client-http";
import {
  parseFieldsFromResponseBodyJSONFieldsKey,
  skipParsingFieldsFromResponse,
  skipTransformFetchOptions,
} from "@madatdata/client-http";
import type { GraphQLClientOptions } from "./plugins";

interface DbSplitgraphPluginHostContext extends GraphQLClientOptions {}

interface DbSplitgraphOptions<ConcretePluginList extends PluginList>
  extends DbOptions<ConcretePluginList>,
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

export type DefaultSplitgraphPluginList = (
  | SplitgraphImportCSVPlugin
  | SplitgraphExportQueryToFilePlugin
)[];

export const makeDefaultPluginList = (
  opts: Pick<
    Required<DbSplitgraphOptions<DefaultSplitgraphPluginList>>,
    "graphqlEndpoint"
  > &
    Pick<
      Partial<DbSplitgraphOptions<DefaultSplitgraphPluginList>>,
      "authenticatedCredential"
    >
) => {
  const graphqlOptions: GraphQLClientOptions = {
    graphqlEndpoint: opts.graphqlEndpoint,
    transformRequestHeaders: makeTransformRequestHeadersForAuthenticatedRequest(
      opts.authenticatedCredential
    ),
  };

  return [
    new SplitgraphImportCSVPlugin({ ...graphqlOptions }),
    // new AirbyteGithubImportPlugin({ ...graphqlOptions }),
    new SplitgraphExportQueryToFilePlugin({ ...graphqlOptions }),
  ];
};

// HACK: Necessary because of some missing type inference
type PluginWithTransformRequestHeadersOption<Plugin> = Plugin & {
  transformRequestHeaders: (headers: HeadersInit) => HeadersInit;
};

export class DbSplitgraph<SplitgraphPluginList extends PluginList>
  extends BaseDb<SplitgraphPluginList, DbSplitgraphPluginHostContext>
  implements
    WithPluginRegistry<
      SplitgraphPluginList,
      DbSplitgraphPluginHostContext,
      DbPluggableInterface<SplitgraphPluginList>
    >
{
  private graphqlEndpoint: string;

  constructor(
    // TODO: consider making opts.plugins optional [or maybe not, since it leads to stressed type inference]
    opts: DbSplitgraphOptions<SplitgraphPluginList>
  ) {
    const graphqlEndpoint =
      opts.graphqlEndpoint ?? (opts.host ?? defaultHost).baseUrls.gql;
    const plugins =
      opts.plugins ??
      makeDefaultPluginList({
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
    Required<DbSplitgraphOptions<SplitgraphPluginList>>,
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
    return super.makeClient<HTTPClientOptions, HTTPStrategies>(
      makeClientForProtocol,
      {
        ...clientOptions,
        bodyMode: "json",
        strategies: {
          makeFetchOptions: ({ credential, query, execOptions }) => {
            // TODO: HACKY. This whole method should be overridable.
            if (this.opts.strategies?.makeFetchOptions) {
              const maybeMadeFetchOptions =
                this.opts.strategies.makeFetchOptions({
                  credential,
                  query,
                  execOptions,
                });
              if (maybeMadeFetchOptions) {
                return maybeMadeFetchOptions;
              }
            }

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
          makeQueryURL: async (makeQueryURLOpts) => {
            // TODO: hack :(
            if (this.opts.strategies?.makeQueryURL) {
              return await this.opts.strategies.makeQueryURL(makeQueryURLOpts);
            }

            const { host, database } = makeQueryURLOpts;

            return Promise.resolve(host.baseUrls.sql + "/" + database.dbname);
          },
          parseFieldsFromResponse: (...args) => {
            // TODO: hack :(
            if (this.opts.strategies?.parseFieldsFromResponse) {
              return this.opts.strategies.parseFieldsFromResponse(...args);
            }
            return skipParsingFieldsFromResponse();
          },
          parseFieldsFromResponseBodyJSON: (...args) => {
            // TODO: hack :(
            if (this.opts.strategies?.parseFieldsFromResponseBodyJSON) {
              return this.opts.strategies.parseFieldsFromResponseBodyJSON(
                ...args
              );
            }
            return parseFieldsFromResponseBodyJSONFieldsKey(...args);
          },
          transformFetchOptions: (...args) => {
            // TODO: hack :(
            if (this.opts.strategies?.transformFetchOptions) {
              return this.opts.strategies.transformFetchOptions(...args);
            }
            return skipTransformFetchOptions(...args);
          },
        },
      }
    );
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

  async exportData<
    PluginName extends ExtractPlugin<
      SplitgraphPluginList,
      ExportPlugin<string>
    >["__name"]
  >(
    pluginName: PluginName,
    ...rest: Parameters<
      ExtractPlugin<
        SplitgraphPluginList,
        ExportPlugin<PluginName>
      >["exportData"]
    >
  ) {
    const [sourceOpts, destOpts] = rest;

    const plugin = this.plugins
      .selectMatchingPlugins(
        (
          plugin
        ): plugin is ExtractPlugin<
          SplitgraphPluginList,
          ExportPlugin<typeof pluginName> & {
            __name: typeof pluginName;
          } & Partial<WithOptionsInterface<ExportPlugin<typeof pluginName>>>
        > =>
          "exportData" in Object.getPrototypeOf(plugin) &&
          plugin.__name === pluginName
      )
      .pop();

    if (!plugin) {
      throw new Error(`plugin not found: ${pluginName}`);
    }

    if (!plugin.withOptions) {
      throw new Error("plugin does not implement withOptions");
    }

    return await plugin
      .withOptions({
        ...this.pluginConfig,
        ...plugin,
        transformRequestHeaders: (headers: HeadersInit) =>
          (
            (plugin as PluginWithTransformRequestHeadersOption<typeof plugin>)
              .transformRequestHeaders ?? IdentityFunc
          )(this.pluginConfig.transformRequestHeaders(headers)),
      })
      .exportData(sourceOpts, destOpts);
  }

  async importData<
    PluginName extends ExtractPlugin<
      SplitgraphPluginList,
      ImportPlugin<string>
    >["__name"]
  >(
    pluginName: PluginName,
    ...rest: Parameters<
      ExtractPlugin<
        SplitgraphPluginList,
        ImportPlugin<PluginName>
      >["importData"]
    >
  ) {
    // TODO: type error in ...rest
    // this.plugins.callFunction(pluginName, "importData", ...rest);

    const [sourceOpts, destOpts] = rest;

    const plugin = this.plugins
      .selectMatchingPlugins(
        (
          plugin
        ): plugin is ExtractPlugin<
          SplitgraphPluginList,
          ImportPlugin<typeof pluginName> & {
            __name: typeof pluginName;
          } & Partial<WithOptionsInterface<ImportPlugin<typeof pluginName>>>
        > =>
          "importData" in Object.getPrototypeOf(plugin) &&
          plugin.__name === pluginName
      )
      .pop();

    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginName}`);
    }

    if (!plugin.withOptions) {
      throw new Error("plugin does not implement withOptions");
    }

    return await plugin
      .withOptions({
        ...this.pluginConfig,
        ...plugin,
        transformRequestHeaders: (headers: HeadersInit) =>
          (
            (plugin as PluginWithTransformRequestHeadersOption<typeof plugin>)
              .transformRequestHeaders ?? IdentityFunc
          )(this.pluginConfig.transformRequestHeaders(headers)),
      })
      .importData(sourceOpts, destOpts);
  }
}

export const makeDb = <SplitgraphPluginList extends PluginList>(
  ...args: ConstructorParameters<typeof DbSplitgraph<SplitgraphPluginList>>
) => {
  const db = new DbSplitgraph(...args);
  return db;
};

const IdentityFunc = <T>(x: T) => x;
