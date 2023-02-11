import type { ImportPlugin, WithOptionsInterface } from "@madatdata/base-db";
import type { SeafowlDestOptions } from "./base-seafowl-import-plugin";
import type { Client } from "@madatdata/base-client";

interface ImportFileDestOptions extends SeafowlDestOptions {
  tableName: SeafowlDestOptions["tableName"];
  schemaName: SeafowlDestOptions["schemaName"];
}

interface ImportFilePluginOptions {
  seafowlClient: Client;
}

interface ImportFileFromURLOptions {
  data?: never;
  url: string;
  format: "csv" | "parquet";
}

// NOTE: Reason for indirection is that eventually the same method might support
// ImportFileFromDataOptions (pass blob, not URL), same as SplitgraphImportCSVPlugin
type ImportFileOptions = ImportFileFromURLOptions;

type DbInjectedOptions = Partial<ImportFilePluginOptions>;

export class SeafowlImportFilePlugin
  implements ImportPlugin, WithOptionsInterface<SeafowlImportFilePlugin>
{
  public readonly opts: Partial<ImportFilePluginOptions>;
  private readonly seafowlClient?: Client;

  public readonly __name = "csv";

  constructor(opts: Partial<ImportFilePluginOptions>) {
    this.opts = opts;

    if (opts.seafowlClient) {
      this.seafowlClient = opts.seafowlClient;
    }
  }

  withOptions(injectOpts: DbInjectedOptions) {
    if (!this.seafowlClient && !injectOpts.seafowlClient) {
      throw new Error("refusing to inject opts while missing seafowlClient");
    }

    return new SeafowlImportFilePlugin({
      ...this.opts,
      ...injectOpts,
    });
  }

  // TODO: actually include destOptions.schemaName in query (schema is noop atm)
  async importData(
    sourceOptions: ImportFileOptions,
    destOptions: ImportFileDestOptions
  ) {
    if (!this.seafowlClient) {
      throw new Error(
        "called importData without seafowlClient, consider building " +
          "a new object, e.g.: plugin.withOptions({seafowlClient: this.seafowlClient})"
      );
    }

    const stagingId = `dataxyz_${destOptions.tableName}`;

    const { response: mountResponse, error: mountError } = await this
      .seafowlClient.execute(`
    CREATE EXTERNAL TABLE ${stagingId}
      STORED AS ${sourceOptions.format}
      LOCATION '${sourceOptions.url}';
    `);

    const { response, error } = await this.seafowlClient.execute(
      `CREATE TABLE ${destOptions.tableName} AS SELECT * FROM staging.${stagingId};`
    );

    return {
      response: {
        success: true,
        ...response,
      },
      error,
      info: {
        mountResponse,
        mountError,
      },
    };
  }
}
