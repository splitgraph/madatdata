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
  ConcretePluginList extends (ImportPlugin<string> | ExportPlugin<string>)[] = (
    | ImportPlugin<string>
    | ExportPlugin<string>
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

  // NOTE: This might include non-write CTE statements, but that failure case is just not caching them
  // which is better than sending a write CTE statement as a GET (which would fail)
  if (
    normalizedQuery.startsWith("WITH") &&
    normalizedQuery.includes("CREATE")
  ) {
    console.warn("Query starts with WITH and includes CREATE, assume write:");
    return "POST";
  }

  if (!normalizedQuery.includes("SELECT")) {
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
      strategies: {
        // TODO: HACK: This is last priority because it was moved here, but this
        // needs a better story for default fields, overrides, etc.
        ...this.opts.strategies,
        // TODO: This should be overideable/injectable from the caller (e.g. the
        // react client should be able to set its own 'mode', etc.)
        makeFetchOptions: ({ credential, query, execOptions }) => {
          // TODO: HACKY. This whole method should be overridable.
          if (this.opts.strategies?.makeFetchOptions) {
            const maybeMadeFetchOptions = this.opts.strategies.makeFetchOptions(
              { credential, query, execOptions }
            );
            if (maybeMadeFetchOptions) {
              return maybeMadeFetchOptions;
            }
          }

          // TODO: this is hacky
          const guessedMethod = guessMethodForQuery(query);

          return {
            method: guessedMethod,
            headers: makeTransformRequestHeadersForAuthenticatedRequest(
              credential as AuthenticatedCredential
            )({
              ...(guessedMethod === "GET"
                ? {
                    // NOTE: The query is fingerprinted _prior_ to encoding, which is
                    // why we encode it at the last opportunity here (whereas it is "normalized"
                    // prior to fingerprinting, which is why the fingerprint function also
                    // calls the normalizeQueryForHTTPHeader function before fingerprinting)
                    "X-Seafowl-Query": encodeURIComponent(
                      this.normalizeQueryForHTTPHeader(query)
                    ),
                  }
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
        makeQueryURL: async (makeQueryURLOpts) => {
          // TODO: hack :(
          if (this.opts.strategies?.makeQueryURL) {
            return await this.opts.strategies.makeQueryURL(makeQueryURLOpts);
          }

          const {
            host,
            query,
            database: { dbname },
          } = makeQueryURLOpts;

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
        parseFieldsFromResponse: (...args) => {
          // TODO: hack :(
          if (this.opts.strategies?.parseFieldsFromResponse) {
            return this.opts.strategies.parseFieldsFromResponse(...args);
          }
          return parseFieldsFromResponseContentTypeHeader(...args);
        },
        parseFieldsFromResponseBodyJSON: (...args) => {
          // TODO: hack :(
          if (this.opts.strategies?.parseFieldsFromResponseBodyJSON) {
            return this.opts.strategies.parseFieldsFromResponseBodyJSON(
              ...args
            );
          }
          return skipParsingFieldsFromResponseBodyJSON();
        },
        transformFetchOptions: (...args) => {
          // TODO: hack :(
          if (this.opts.strategies?.transformFetchOptions) {
            return this.opts.strategies.transformFetchOptions(...args);
          }
          return skipTransformFetchOptions(...args);
        },
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

  // TODO: atm, there are no Seafowl export plugins
  async exportData<
    PluginName extends ExtractPlugin<
      SeafowlPluginList,
      ExportPlugin<string>
    >["__name"]
  >(
    _pluginName: PluginName,
    ..._rest: Parameters<
      ExtractPlugin<SeafowlPluginList, ExportPlugin<PluginName>>["exportData"]
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

  async importData<
    PluginName extends ExtractPlugin<
      SeafowlPluginList,
      ImportPlugin<string>
    >["__name"]
  >(
    pluginName: PluginName,
    ...rest: Parameters<
      ExtractPlugin<SeafowlPluginList, ImportPlugin<PluginName>>["importData"]
    >
  ) {
    const [sourceOpts, destOpts] = rest;

    const plugin = this.plugins
      .selectMatchingPlugins(
        (
          plugin
        ): plugin is ExtractPlugin<
          SeafowlPluginList,
          ImportPlugin<PluginName> &
            Partial<WithOptionsInterface<ImportPlugin<PluginName>>>
        > =>
          "importData" in Object.getPrototypeOf(plugin) &&
          plugin.__name === pluginName
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
