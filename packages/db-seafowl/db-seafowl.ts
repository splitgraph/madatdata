import { BaseDb, type DbOptions } from "@madatdata/base-db";
import type { SeafowlImportPluginMap } from "./plugins/importers";

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
import type { Strategies } from "@madatdata/client-http";

interface DbSeafowlOptions extends DbOptions<Partial<SeafowlImportPluginMap>> {}

const makeDefaultPluginMap = (opts: {
  makeAuthHeaders: () => HeadersInit;
}) => ({
  csv: new ImportCSVPlugin({
    transformRequestHeaders: (reqHeaders) =>
      opts.makeAuthHeaders
        ? {
            ...reqHeaders,
            ...opts.makeAuthHeaders(),
          }
        : reqHeaders,
  }),
});

export class DbSeafowl extends BaseDb<Partial<SeafowlImportPluginMap>> {
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

  public makeHTTPClient(
    makeClientForProtocol: (wrappedOptions: ClientOptions) => Client,
    clientOptions: ClientOptions
  ) {
    // FIXME: do we need to depend on all of client-http just for `strategies` type?
    return super.makeClient<{ bodyMode: "jsonl"; strategies: Strategies }>(
      makeClientForProtocol,
      {
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
        } as Strategies,
      }
    );
  }

  async importData<PluginName extends keyof SeafowlImportPluginMap>(
    pluginName: PluginName,
    ...rest: Parameters<SeafowlImportPluginMap[PluginName]["importData"]>
  ) {
    const [sourceOpts, destOpts] = rest;

    // TODO: temporarily hardcode the plugin map
    const plugin = (this.plugins as ReturnType<typeof makeDefaultPluginMap>)[
      pluginName
    ];

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
