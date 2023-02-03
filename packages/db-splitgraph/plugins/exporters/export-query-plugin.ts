import type { ExportPlugin, WithOptionsInterface } from "@madatdata/base-db";
import { SplitgraphGraphQLClient } from "../../gql-client/splitgraph-graphql-client";
import { ExportFormat } from "../../gql-client/generated/unified-schema";

import { gql } from "graphql-request";
import type {
  StartExportJobMutation,
  StartExportJobMutationVariables,
} from "./export-query-plugin.generated";

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
    sourceOptions: ExportQuerySourceOptions,
    destOptions: ExportQueryDestOptions
  ) {
    const {
      response: exportResponse,
      error: exportError,
      info: exportInfo,
    } = await this.startExport(sourceOptions, destOptions);

    if (exportError || !exportResponse) {
      return {
        response: null,
        error: exportError,
        info: { ...exportInfo },
      };
    }
    const { id: taskId, filename } = exportResponse.exportQuery;

    return {
      response: {
        success: true,
        taskId,
        filename,
      },
      error: null,
      info: {},
    };
  }

  private async startExport(
    sourceOptions: ExportQuerySourceOptions,
    destOptions: ExportQueryDestOptions
  ) {
    return this.graphqlClient.send<
      StartExportJobMutation,
      StartExportJobMutationVariables
    >(
      gql`
        mutation StartExportJob(
          $query: String!
          $format: ExportFormat!
          $filename: String!
          $vdbId: String = null
        ) {
          exportQuery(
            query: $query
            format: $format
            filename: $filename
            vdbId: $vdbId
          ) {
            filename
            id
          }
        }
      `,
      {
        query: sourceOptions.query,
        format: (() => {
          switch (destOptions.format) {
            case "csv":
              return ExportFormat.Csv;
            case "parquet":
              return ExportFormat.Parquet;
          }
        })(),
        filename: destOptions.filename ?? "exported-query",
        vdbId: sourceOptions.vdbId,
      }
    );
  }
}

const IdentityFunc = <T>(x: T) => x;
