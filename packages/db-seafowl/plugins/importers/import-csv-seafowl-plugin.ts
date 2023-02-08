import type { ImportPlugin, WithOptionsInterface } from "@madatdata/base-db";
import type { SeafowlDestOptions } from "./base-seafowl-import-plugin";
import type { Client } from "@madatdata/base-client";

interface ImportCSVDestOptions extends SeafowlDestOptions {
  tableName: SeafowlDestOptions["tableName"];
  schemaName: SeafowlDestOptions["schemaName"];
}

interface ImportCSVPluginOptions {
  seafowlClient: Client;
}

interface ImportCSVBaseOptions {
  // _type: "import-csv-base";
  // importType: "csv";
}

interface ImportCSVFromURLOptions extends ImportCSVBaseOptions {
  data?: never;
  url: string;
  format: "csv" | "parquet";
}

interface ImportCSVFromDataOptions extends ImportCSVBaseOptions {
  data: BodyInit;
  url?: never;
  format: "csv" | "parquet";
}

type ImportCSVSourceOptions =
  | ImportCSVFromURLOptions
  | ImportCSVFromDataOptions;

type DbInjectedOptions = Partial<ImportCSVPluginOptions>;

export class ImportCSVPlugin
  implements ImportPlugin, WithOptionsInterface<ImportCSVPlugin>
{
  public readonly opts: Partial<ImportCSVPluginOptions>;
  private readonly seafowlClient?: Client;

  constructor(opts: Partial<ImportCSVPluginOptions>) {
    this.opts = opts;

    if (opts.seafowlClient) {
      this.seafowlClient = opts.seafowlClient;
    }
  }

  // TODO: improve it (e.g. allow either mutation or copy), and/or generalize it
  withOptions(injectOpts: DbInjectedOptions) {
    if (!this.seafowlClient && !injectOpts.seafowlClient) {
      throw new Error("refusing to inject opts while missing seafowlClient");
    }

    return new ImportCSVPlugin({
      ...this.opts,
      ...injectOpts,
    });
  }

  // TODO: include destOptions.schemaName in query
  async importData(
    sourceOptions: ImportCSVSourceOptions,
    destOptions: ImportCSVDestOptions
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
