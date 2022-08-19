import type { Plugin } from "@madatdata/base-db";
import type { SeafowlDestOptions } from "./base-seafowl-import-plugin";

interface ImportCSVDestOptions extends SeafowlDestOptions {
  tableName: SeafowlDestOptions["tableName"];
  schemaName: SeafowlDestOptions["schemaName"];
}

interface ImportCSVPluginOptions {
  transformRequestHeaders?: (requestHeaders: HeadersInit) => HeadersInit;
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

export class ImportCSVPlugin implements Plugin {
  public readonly opts: ImportCSVPluginOptions;
  public readonly transformRequestHeaders: Required<ImportCSVPluginOptions>["transformRequestHeaders"];

  constructor(opts: ImportCSVPluginOptions) {
    this.opts = opts;

    this.transformRequestHeaders = opts.transformRequestHeaders ?? IdentityFunc;
  }

  // TODO: improve it (e.g. allow either mutation or copy), and/or generalize it
  withOptions(injectOpts: DbInjectedOptions) {
    return new ImportCSVPlugin({
      ...this.opts,
      ...injectOpts,
      // TODO: replace transformer with some kind of chainable "link" plugin
      transformRequestHeaders: (reqHeaders) => {
        const withOriginal = {
          ...reqHeaders,
          ...this.opts.transformRequestHeaders?.(reqHeaders),
        };

        const withNext = {
          ...withOriginal,
          ...injectOpts.transformRequestHeaders?.(withOriginal),
        };

        return {
          ...withOriginal,
          ...withNext,
        };
      },
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

const IdentityFunc = <T>(x: T) => x;
