import type { SplitgraphDestOptions } from "./base-import-plugin";
import { request, gql } from "graphql-request";

interface ImportCSVPluginOptions {
  graphqlEndpoint: string;
  transformRequestHeaders?: (requestHeaders: HeadersInit) => HeadersInit;
}

interface ImportCSVSourceOptions {
  url: string;
}

export interface ImportCSVPlugin {
  importData: (
    sourceOptions: ImportCSVSourceOptions,
    destOptions: SplitgraphDestOptions
  ) => Promise<unknown>;
}

export class ImportCSV implements ImportCSVPlugin {
  private graphqlEndpoint: ImportCSVPluginOptions["graphqlEndpoint"];
  private transformRequestHeaders: ImportCSVPluginOptions["transformRequestHeaders"];

  constructor(opts: ImportCSVPluginOptions) {
    this.graphqlEndpoint = opts.graphqlEndpoint;
    this.transformRequestHeaders = opts.transformRequestHeaders;
  }

  async importData(
    sourceOptions: ImportCSVSourceOptions,
    destOptions: SplitgraphDestOptions
  ) {
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

// type OmitFirst<ItemType = any, ListType = ItemType[]> =

// type DropFirst<T extends unknown[]> = T extends [any, ...infer U] ? U : never;
