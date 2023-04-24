import {
  BaseDb,
  type DbOptions,
  type DbPluggableInterface,
  type WithPluginRegistry,
  type ImportPlugin,
  type ExportPlugin,
  type ExtractPlugin,
  type PluginList,
  type WithOptionsInterface,
} from "@madatdata/base-db";

// TODO: This sould be injected in the constructor as the actual plugin map
import { SeafowlImportFilePlugin } from "./plugins/importers/seafowl-import-file-plugin";

// TODO: It's not ideal for db-splitgraph to depend on base-client
import {
  type Client,
  type ClientOptions,
  type AuthenticatedCredential,
  makeAuthHeaders,
} from "@madatdata/base-client";

import {
  makeClient as makeHTTPClient,
  parseFieldsFromResponseContentTypeHeader,
  skipParsingFieldsFromResponseBodyJSON,
  skipTransformFetchOptions,
} from "@madatdata/client-http";

// FIXME: we _should_ only be depending on types from this pacakge - should
// they be in a separate package from the actual http-client?
import type { HTTPStrategies, HTTPClientOptions } from "@madatdata/client-http";

export type DefaultSeafowlPluginList<
  ConcretePluginList extends (ImportPlugin | ExportPlugin)[] = (
    | ImportPlugin
    | ExportPlugin
  )[]
> = ConcretePluginList[number][];

interface DbSeafowlOptions<ConcretePluginList extends PluginList>
  extends DbOptions<ConcretePluginList> {}

// NOTE: optional here because we don't set in constructor but we do in withOptions
// this is because the type is self referential (config object needs class instantiated)
export const makeDefaultPluginList = (opts: { seafowlClient?: Client }) => [
  new SeafowlImportFilePlugin({ seafowlClient: opts.seafowlClient }),
  // {
  //   __name: "csv", // NOTE: duplicate names intentional, they implement different interfaces
  //   withOptions: (opts: any): any => {},
  //   exportData: () =>
  //     Promise.resolve({ response: "export-ok", error: null, info: null }),
  // },
];

type HeaderTransformer = (requestHeaders: HeadersInit) => HeadersInit;

const makeTransformRequestHeadersForAuthenticatedRequest =
  (maybeAuthenticatedCredential?: AuthenticatedCredential): HeaderTransformer =>
  (reqHeaders) => ({
    ...reqHeaders,
    ...(maybeAuthenticatedCredential
      ? makeAuthHeaders(maybeAuthenticatedCredential)
      : {}),
  });

const guessMethodForQuery = (query: string) => {
  const writeStatements = [
    "INSERT",
    "UPDATE",
    "DELETE",
    "ALTER",
    "VACUUM",
    "CREATE",
    "DROP",
  ];

  const normalizedQuery = query.trim().toUpperCase();

  if (writeStatements.some((write) => normalizedQuery.startsWith(write))) {
    return "POST";
  }
  if (!query.includes("SELECT")) {
    console.warn("No SELECT in query, but assuming GET:", query);
  }

  return "GET";
};

interface DbSeafowlPluginHostContext {
  seafowlClient: Client;
}

export class DbSeafowl<SeafowlPluginList extends PluginList>
  extends BaseDb<SeafowlPluginList, DbSeafowlPluginHostContext>
  implements
    WithPluginRegistry<
      SeafowlPluginList,
      DbSeafowlPluginHostContext,
      DbPluggableInterface<SeafowlPluginList>
    >
{
  constructor(opts: DbSeafowlOptions<SeafowlPluginList>) {
    const plugins = opts.plugins ?? makeDefaultPluginList({});

    super({
      ...opts,
      plugins,
    });
  }

  // NOTE: we want this to update when this.authenticatedCredential updates
  private get pluginConfig(): {
    transformRequestHeaders: HeaderTransformer;
  } {
    return {
      transformRequestHeaders:
        makeTransformRequestHeadersForAuthenticatedRequest(
          this.authenticatedCredential
        ),
    };
  }

  async fetchCredentials() {
    await Promise.resolve();
  }

  public get httpClientOptions(): HTTPClientOptions {
    return {
      bodyMode: "jsonl",
      // TODO: db splitgraph needs this too
      strategies: this.opts.strategies ?? {
        // TODO: This should be overideable/injectable from the caller (e.g. the
        // react client should be able to set its own 'mode', etc.)
        makeFetchOptions: ({ credential, query }) => {
          // TODO: this is hacky
          const guessedMethod = guessMethodForQuery(query);

          return {
            method: guessedMethod,
            headers: makeTransformRequestHeadersForAuthenticatedRequest(
              credential as AuthenticatedCredential
            )({
              ...(guessedMethod === "GET"
                ? { "X-Seafowl-Query": this.normalizeQueryForHTTPHeader(query) }
                : {}),
              "Content-Type": "application/json",
            }),
            ...(guessedMethod === "POST"
              ? {
                  body: JSON.stringify({ query }),
                }
              : {}),
          };
        },
        makeQueryURL: async ({ host, query, database: { dbname } }) => {
          const withoutTrailingSlash = host.baseUrls.sql.replace(/\/+$/g, "");

          const baseQueryUrl = dbname
            ? [withoutTrailingSlash, dbname, "q"].join("/")
            : [withoutTrailingSlash, "q"].join("/");

          if (!query) {
            return baseQueryUrl;
          }

          // NOTE: The .csv extension is "ignored" (the data is still returned as jsonl),
          // but forces cloudflare to cache it, and return cache headers in the response
          // TODO: Make this configurable (maybe you don't want caching sometimes)
          const extension = ".csv";

          const { fingerprint } = await this.fingerprintQuery(query ?? "");
          const guessedMethod = guessMethodForQuery(query);
          return guessedMethod === "GET"
            ? baseQueryUrl + "/" + fingerprint + extension
            : baseQueryUrl;
        },
        parseFieldsFromResponse: parseFieldsFromResponseContentTypeHeader,
        parseFieldsFromResponseBodyJSON: skipParsingFieldsFromResponseBodyJSON,
        transformFetchOptions: skipTransformFetchOptions,
      },
    };
  }

  // FIXME: make static, decouple from instance (needs better defaults system)
  //        e.g. a static property member pointing to Class defining callbacks
  //        or just utilize the existing class hiearchy of client-http/SqlHttpClient
  public makeHTTPClient(
    makeClientForProtocol?: (wrappedOptions: ClientOptions) => Client,
    clientOptions?: ClientOptions & HTTPClientOptions
  ) {
    // FIXME: do we need to depend on all of client-http just for `strategies` type?
    // FIXME: this pattern would probably work better as a user-provided Class
    // nb: careful to keep parity with (intentionally) same code in db-splitgraph.ts
    return super.makeClient<HTTPClientOptions, HTTPStrategies>(
      makeClientForProtocol ?? makeHTTPClient,
      {
        ...clientOptions,
        ...this.httpClientOptions,
      }
    );
  }

  async exportData(
    _pluginName: ExtractPlugin<SeafowlPluginList, ExportPlugin>["__name"],
    ..._rest: Parameters<
      ExtractPlugin<SeafowlPluginList, ExportPlugin>["exportData"]
    >
  ): Promise<unknown> {
    await Promise.resolve();
    return {
      response: null,
      error: {
        success: false,
      },
      info: null,
    };
  }

  async importData(
    pluginName: ExtractPlugin<SeafowlPluginList, ImportPlugin>["__name"],
    ...rest: Parameters<
      ExtractPlugin<SeafowlPluginList, ImportPlugin>["importData"]
    >
  ) {
    const [sourceOpts, destOpts] = rest;

    const plugin = this.plugins
      .selectMatchingPlugins(
        (
          plugin
        ): plugin is ExtractPlugin<
          SeafowlPluginList,
          ImportPlugin & { __name: typeof pluginName } & Partial<
              WithOptionsInterface<ImportPlugin>
            >
        > => "importData" in Object.getPrototypeOf(plugin)
      )
      .pop();

    if (!plugin) {
      throw new Error(`plugin not found: ${pluginName}`);
    }

    if (!plugin.withOptions) {
      throw new Error("plugin does not implement withOptions");
    }

    if (plugin) {
      return await plugin
        .withOptions({
          ...this.pluginConfig,
          ...plugin,
          seafowlClient: this.makeHTTPClient(),
          // NOTE: If you're adding an acculumulated callback like transformRequestHeaders
          // make sure to define it as a wrapper, similarly to how it is in db-splitgraph.ts
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

export const makeDb = <SeafowlPluginList extends PluginList>(
  ...args: ConstructorParameters<typeof DbSeafowl<SeafowlPluginList>>
) => {
  const db = new DbSeafowl(...args);
  return db;
};
