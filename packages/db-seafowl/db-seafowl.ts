import { BaseDb, OptionalPluginMap, type DbOptions } from "@madatdata/base-db";
import type {
  SeafowlPluginMap,
  SeafowlExportPluginMap,
  SeafowlImportPluginMap,
} from "./plugins/importers";

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

interface DbSeafowlOptions
  extends DbOptions<OptionalPluginMap<SeafowlPluginMap>> {}

// NOTE: optional here because we don't set in constructor but we do in withOptions
// this is because the type is self referential (config object needs class instantiated)
const makeDefaultPluginMap = (opts: { seafowlClient?: Client }) => ({
  importers: {
    csv: new SeafowlImportFilePlugin({ seafowlClient: opts.seafowlClient }),
  },
  exporters: {},
});

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

export class DbSeafowl extends BaseDb<OptionalPluginMap<SeafowlPluginMap>> {
  constructor(
    opts: Omit<DbSeafowlOptions, "plugins"> &
      Pick<Partial<DbSeafowlOptions>, "plugins">
  ) {
    super({
      ...opts,
      plugins: opts.plugins ?? makeDefaultPluginMap({}),
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
      } as HTTPStrategies,
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
    return super.makeClient<HTTPClientOptions>(
      makeClientForProtocol ?? makeHTTPClient,
      {
        ...clientOptions,
        ...this.httpClientOptions,
      }
    );
  }

  async exportData<PluginName extends keyof SeafowlExportPluginMap>(
    _pluginName: PluginName,
    ..._rest: Parameters<SeafowlExportPluginMap[PluginName]["exportData"]>
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

  async importData<PluginName extends keyof SeafowlImportPluginMap>(
    pluginName: PluginName,
    ...rest: Parameters<SeafowlImportPluginMap[PluginName]["importData"]>
  ) {
    const [sourceOpts, destOpts] = rest;

    // TODO: temporarily hardcode the plugin map
    const plugin = this.plugins.importers[pluginName];
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
