import type { Plugin } from "@madatdata/base-db";
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

export class ImportCSVPlugin implements Plugin {
  private graphqlEndpoint: ImportCSVPluginOptions["graphqlEndpoint"];
  private transformRequestHeaders: ImportCSVPluginOptions["transformRequestHeaders"];

  constructor(opts: ImportCSVPluginOptions) {
    // super();
    this.graphqlEndpoint = opts.graphqlEndpoint;
    this.transformRequestHeaders = opts.transformRequestHeaders;
  }

  async importData(
    sourceOptions: ImportCSVSourceOptions,
    destOptions: SplitgraphDestOptions
  ) {
    console.table({
      graphqlEndpoint: this.graphqlEndpoint,
      transformRequestHeaders: this.transformRequestHeaders ? "yes" : "no",
      sourceOptions,
      destOptions,
    });
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
