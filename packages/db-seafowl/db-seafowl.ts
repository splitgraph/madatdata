import { BaseDb, OptionalPluginMap, type DbOptions } from "@madatdata/base-db";
import type {
  SeafowlPluginMap,
  SeafowlExportPluginMap,
  SeafowlImportPluginMap,
} from "./plugins/importers";

// TODO: This sould be injected in the constructor as the actual plugin map
import { ImportCSVPlugin } from "./plugins/importers/import-csv-seafowl-plugin";

// TODO: It's not ideal for db-splitgraph to depend on base-client
import {
  type Client,
  type ClientOptions,
  makeAuthHeaders,
} from "@madatdata/base-client";

// FIXME: we _should_ only be depending on types from this pacakge - should
// they be in a separate package from the actual http-client?
import type { HTTPStrategies, HTTPClientOptions } from "@madatdata/client-http";

interface DbSeafowlOptions
  extends DbOptions<OptionalPluginMap<SeafowlPluginMap>> {}

const makeDefaultPluginMap = (opts: {
  makeAuthHeaders: () => HeadersInit;
}) => ({
  importers: {
    csv: new ImportCSVPlugin({
      transformRequestHeaders: (reqHeaders) =>
        opts.makeAuthHeaders
          ? {
              ...reqHeaders,
              ...opts.makeAuthHeaders(),
            }
          : reqHeaders,
    }),
  },
  exporters: {},
});

export class DbSeafowl extends BaseDb<OptionalPluginMap<SeafowlPluginMap>> {
  constructor(
    opts: Omit<DbSeafowlOptions, "plugins"> &
      Pick<Partial<DbSeafowlOptions>, "plugins">
  ) {
    super({
      ...opts,
      plugins:
        opts.plugins ??
        makeDefaultPluginMap({
          makeAuthHeaders: () =>
            this.authenticatedCredential
              ? makeAuthHeaders(this.authenticatedCredential)
              : {},
        }),
    });
  }

  // FIXME: make static, decouple from instance (needs better defaults system)
  //        e.g. a static property member pointing to Class defining callbacks
  //        or just utilize the existing class hiearchy of client-http/SqlHttpClient
  public makeHTTPClient(
    makeClientForProtocol: (wrappedOptions: ClientOptions) => Client,
    clientOptions: ClientOptions & HTTPClientOptions
  ) {
    // FIXME: do we need to depend on all of client-http just for `strategies` type?
    // FIXME: this pattern would probably work better as a user-provided Class
    // nb: careful to keep parity with (intentionally) same code in db-splitgraph.ts
    return super.makeClient<HTTPClientOptions>(makeClientForProtocol, {
      ...clientOptions,
      bodyMode: "jsonl",
      strategies: {
        makeFetchOptions: ({ credential: _credential, query }) => {
          return {
            method: "GET",
            headers: {
              "X-Seafowl-Query": this.normalizeQueryForHTTPHeader(query),
              "Content-Type": "application/json",
            },
          };
        },
        makeQueryURL: async ({ host, query }) => {
          if (!query) {
            return host.baseUrls.sql;
          }

          const { fingerprint } = await this.fingerprintQuery(query ?? "");
          return host.baseUrls.sql + "/" + fingerprint;
        },
      } as HTTPStrategies,
    });
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
          transformRequestHeaders: (reqHeaders: any) =>
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

export const makeDb = (...args: ConstructorParameters<typeof DbSeafowl>) => {
  const db = new DbSeafowl(...args);
  return db;
};
