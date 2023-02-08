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
}

interface ImportCSVFromDataOptions extends ImportCSVBaseOptions {
  data: BodyInit;
  url?: never;
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

  async importData(
    sourceOptions: ImportCSVSourceOptions,
    destOptions: ImportCSVDestOptions
  ) {
    console.log("Placeholder: import data plugin for seafowl");
    console.log("sourceOptions:", sourceOptions);
    console.log("destOptions:", destOptions);

    return {
      response: {
        success: true,
      },
      error: null,
      info: null,
    };
  }
}
