import type { SplitgraphDestOptions } from "./base-import-plugin";
import { request, gql } from "graphql-request";
import type { SplitgraphImportPlugin } from "./base-import-plugin";

interface ImportCSVPluginOptions {
  graphqlEndpoint: string;
  transformRequestHeaders?: (requestHeaders: HeadersInit) => HeadersInit;
}

interface ImportCSVSourceOptions {
  url: string;
}

export interface ImportCSVPluginInterface {
  importData: <
    SourceOptions = ImportCSVSourceOptions,
    DestOptions = SplitgraphDestOptions,
    ResultShape = { success: true },
    ErrorShape = { success: false }
  >(
    sourceOptions: SourceOptions,
    destOptions: DestOptions
  ) => Promise<{ response: ResultShape | null; error: ErrorShape | null }>;
}
export class ImportCSVPlugin implements ImportCSVPluginInterface {
  private graphqlEndpoint: ImportCSVPluginOptions["graphqlEndpoint"];
  private transformRequestHeaders: ImportCSVPluginOptions["transformRequestHeaders"];

  constructor(opts: ImportCSVPluginOptions) {
    this.graphqlEndpoint = opts.graphqlEndpoint;
    this.transformRequestHeaders = opts.transformRequestHeaders;
  }

  async importData<
    SourceOptions = ImportCSVSourceOptions,
    DestOptions = SplitgraphDestOptions,
    ResultShape = { success: true },
    ErrorShape = { success: false }
  >(sourceOptions: SourceOptions, destOptions: DestOptions) {
    if (sourceOptions.url === "foo") {
      return {
        response: {
          success: true,
        } as unknown as ResultShape,
        error: null,
      };
    } else {
      return {
        response: null,
        error: {
          success: false,
        } as unknown as ErrorShape,
      };
    }
  }
}

// type OmitFirst<ItemType = any, ListType = ItemType[]> =

// type DropFirst<T extends unknown[]> = T extends [any, ...infer U] ? U : never;
