import type { ExportPlugin, WithOptionsInterface } from "@madatdata/base-db";
import { SplitgraphGraphQLClient } from "../../gql-client/splitgraph-graphql-client";

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
type DbInjectedOptions = Partial<ExportQueryPluginOptions>;

export class ExportQueryPlugin
  implements ExportPlugin, WithOptionsInterface<ExportQueryPlugin>
{
  private readonly opts: ExportQueryPluginOptions;
  public readonly graphqlEndpoint: ExportQueryPluginOptions["graphqlEndpoint"];
  public readonly graphqlClient: SplitgraphGraphQLClient;
  public readonly transformRequestHeaders: Required<ExportQueryPluginOptions>["transformRequestHeaders"];

  constructor(opts: ExportQueryPluginOptions) {
    this.opts = opts;

    this.graphqlEndpoint = opts.graphqlEndpoint;
    this.transformRequestHeaders = opts.transformRequestHeaders ?? IdentityFunc;

    this.graphqlClient = new SplitgraphGraphQLClient({
      graphqlEndpoint: this.graphqlEndpoint,
      transformRequestHeaders: this.transformRequestHeaders,
    });
  }

  // TODO: DRY with other plugins
  withOptions(injectOpts: DbInjectedOptions) {
    return new ExportQueryPlugin({
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

const IdentityFunc = <T>(x: T) => x;
