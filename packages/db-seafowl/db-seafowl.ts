import { BaseDb, type DbOptions } from "@madatdata/base-db";
import type { SeafowlImportPluginMap } from "./plugins/importers";

// TODO: This sould be injected in the constructor as the actual plugin map
import { ImportCSVPlugin } from "./plugins/importers/import-csv-seafowl-plugin";

// TODO: It's not ideal for db-splitgraph to depend on base-client
import { makeAuthHeaders } from "@madatdata/base-client";

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
