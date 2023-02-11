import {
  BaseDb,
  type DbOptions,
  type DbPluggableInterface,
  type WithPluginRegistry,
  type ImportPlugin,
  type ExportPlugin,
} from "@madatdata/base-db";

import type { ValidPluginNameFromListMatchingType } from "@madatdata/base-db/plugin-registry";

// TODO: This sould be injected in the constructor as the actual plugin map
import { SeafowlImportFilePlugin } from "./plugins/importers/seafowl-import-file-plugin";

// TODO: It's not ideal for db-splitgraph to depend on base-client
import {
  type Client,
  type ClientOptions,
  type AuthenticatedCredential,
  makeAuthHeaders,
} from "@madatdata/base-client";

import { makeClient as makeHTTPClient } from "@madatdata/client-http";

// FIXME: we _should_ only be depending on types from this pacakge - should
// they be in a separate package from the actual http-client?
import type { HTTPStrategies, HTTPClientOptions } from "@madatdata/client-http";

type SeafowlPluginList<
  ConcretePluginList extends (ImportPlugin | ExportPlugin)[] = (
    | ImportPlugin
    | ExportPlugin
  )[]
> = ConcretePluginList;

interface DbSeafowlOptions extends DbOptions<SeafowlPluginList> {}

// NOTE: optional here because we don't set in constructor but we do in withOptions
// this is because the type is self referential (config object needs class instantiated)
const makeDefaultPluginList = (opts: {
  seafowlClient?: Client;
}): SeafowlPluginList => [
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
  return query.trim().startsWith("CREATE TABLE ") ||
    query.trim().startsWith("CREATE EXTERNAL TABLE ")
    ? "POST"
    : "GET";
};

interface DbSeafowlPluginHostContext {
  seafowlClient: Client;
}

export class DbSeafowl
  extends BaseDb<SeafowlPluginList, DbSeafowlPluginHostContext>
  implements
    WithPluginRegistry<
      SeafowlPluginList,
      DbSeafowlPluginHostContext,
      DbPluggableInterface<SeafowlPluginList>,
      {
        exporters: Extract<SeafowlPluginList[number], ExportPlugin>;
        importers: Extract<SeafowlPluginList[number], ImportPlugin>;
      },
      {
        importers: (
          plugin: SeafowlPluginList[number]
        ) => plugin is Extract<SeafowlPluginList[number], ImportPlugin>;
        exporters: (
          plugin: SeafowlPluginList[number]
        ) => plugin is Extract<SeafowlPluginList[number], ExportPlugin>;
      }
    >
{
  constructor(
    opts: Omit<DbSeafowlOptions, "plugins"> &
      Pick<Partial<DbSeafowlOptions>, "plugins">
  ) {
    super({
      ...opts,
      plugins: opts.plugins ?? makeDefaultPluginList({}),
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
    this.setAuthenticatedCredential({
      // @ts-expect-error https://stackoverflow.com/a/70711231
      token: import.meta.env.VITE_TEST_SEAFOWL_SECRET,
      anonymous: false,
    });
  }

  public get httpClientOptions(): HTTPClientOptions {
    return {
      bodyMode: "jsonl",
      strategies: {
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
        makeQueryURL: async ({ host, query }) => {
          if (!query) {
            return host.baseUrls.sql;
          }

          const { fingerprint } = await this.fingerprintQuery(query ?? "");
          const guessedMethod = guessMethodForQuery(query);
          return guessedMethod === "GET"
            ? host.baseUrls.sql + "/" + fingerprint
            : host.baseUrls.sql;
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

  async exportData<
    PluginName extends ValidPluginNameFromListMatchingType<
      SeafowlPluginList,
      ExportPlugin
    >
  >(
    _pluginName: PluginName,
    ..._rest: Parameters<ExportPlugin["exportData"]>
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
    PluginName extends ValidPluginNameFromListMatchingType<
      SeafowlPluginList,
      ImportPlugin
    >
  >(pluginName: PluginName, ...rest: Parameters<ImportPlugin["importData"]>) {
    const [sourceOpts, destOpts] = rest;

    // TODO: temporarily hardcode the plugin map
    const plugin = this.plugins.pluginMap.importers[pluginName];
    if (!plugin) {
      throw new Error(`plugin not found: ${pluginName}`);
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

export const makeDb = (...args: ConstructorParameters<typeof DbSeafowl>) => {
  const db = new DbSeafowl(...args);
  return db;
};
