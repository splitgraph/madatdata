import type { DbOptions, Plugin } from "@madatdata/base-db";
import type { SplitgraphDestOptions } from "./base-import-plugin";

// TODO: next
// import { request, gql } from "graphql-request";

interface ImportCSVPluginOptions {
  graphqlEndpoint: string;
  transformRequestHeaders?: (requestHeaders: HeadersInit) => HeadersInit;
}

interface ImportCSVSourceOptions {
  url: string;
}

type DbInjectedOptions = Partial<ImportCSVPluginOptions>;

export class ImportCSVPlugin implements Plugin {
  public readonly opts: ImportCSVPluginOptions;
  public readonly graphqlEndpoint: ImportCSVPluginOptions["graphqlEndpoint"];
  public readonly transformRequestHeaders: ImportCSVPluginOptions["transformRequestHeaders"];

  constructor(opts: ImportCSVPluginOptions) {
    this.opts = opts;
    this.graphqlEndpoint = opts.graphqlEndpoint;
    this.transformRequestHeaders = opts.transformRequestHeaders;
  }

  withOptions(injectOpts: DbInjectedOptions) {
    return new ImportCSVPlugin({
      ...this.opts,
      ...injectOpts,
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
    destOptions: SplitgraphDestOptions
  ) {
    // console.table({
    //   graphqlEndpoint: this.graphqlEndpoint,
    //   transformRequestHeaders: this.transformRequestHeaders ? "yes" : "no",
    //   sourceOptions,
    //   destOptions,
    // });

    if (this.transformRequestHeaders) {
      console.log(
        'transformRequestHeaders({ "auth": "foo" }) =>',
        this.transformRequestHeaders({ auth: "foo" })
      );
    }

    if (sourceOptions.url === "foo") {
      return {
        response: {
          success: true,
        },
        error: null,
      };
    } else {
      return {
        response: null,
        error: {
          success: false,
        },
      };
    }
  }
}
