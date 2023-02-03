import type { ExportPlugin } from "@madatdata/base-db";

// import { gql } from "graphql-request";

type ExportQuerySourceOptions = {
  /**
   * The raw SQL query for which to export the result
   */
  query: string;
  /**
   * Run export in the context of vdb with this vdbId (default: ddn)
   */
  vdbId?: string;
};

type ExportQueryDestOptions = {
  format: "csv" | "parquet";
  filename?: string;
};

// from unified spec
// type _ExportJobStatus = "status" | "finished" | "output" | "started";

interface ExportQueryPluginOptions {
  graphqlEndpoint: string;
  transformRequestHeaders?: (requestHeaders: HeadersInit) => HeadersInit;
}

export class ExportQueryPlugin implements ExportPlugin {
  private readonly opts: ExportQueryPluginOptions;

  constructor(opts: ExportQueryPluginOptions) {
    this.opts = opts;
  }

  async exportData(
    _sourceOptions: ExportQuerySourceOptions,
    _destOptions: ExportQueryDestOptions
  ) {
    console.log("exportData");
    console.log("opts:", this.opts);
    await Promise.resolve();

    return {
      response: {
        success: true,
      },
      error: null,
      info: {
        jobStatus: "finished",
      },
    };
  }
}
