import type { ExportPlugin, WithOptionsInterface } from "@madatdata/base-db";
import {
  ExportFormat,
  type ExportJobOutput,
} from "../../gql-client/unified-types";

import { gql } from "graphql-request";
import type {
  StartExportJobMutation,
  StartExportJobMutationVariables,
} from "./splitgraph-export-query-to-file-plugin.generated";
import {
  DeferredSplitgraphExportTask,
  SplitgraphExportPlugin,
} from "./splitgraph-base-export-plugin";
import type { DeferredTaskPlugin } from "@madatdata/base-db/base-db";

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

export class SplitgraphExportQueryToFilePlugin
  extends SplitgraphExportPlugin<
    "export-query-to-file",
    SplitgraphExportQueryToFilePlugin,
    ExportQuerySourceOptions,
    ExportQueryDestOptions,
    Record<string, unknown>,
    Awaited<ReturnType<ExportPlugin<"export-query-to-file">["exportData"]>>
  >
  implements
    ExportPlugin<"export-query-to-file">,
    DeferredTaskPlugin<"export-query-to-file", DeferredSplitgraphExportTask>,
    WithOptionsInterface<SplitgraphExportQueryToFilePlugin>
{
  public readonly __name = "export-query-to-file";
  public static readonly __name = "export-query-to-file";

  async exportData(
    sourceOptions: ExportQuerySourceOptions,
    destOptions: ExportQueryDestOptions,
    exportOptions?: { defer: boolean }
  ) {
    const {
      response: exportResponse,
      error: exportError,
      info: exportInfo,
    } = await this.startExport(sourceOptions, destOptions);

    if (exportOptions?.defer) {
      return {
        taskId: exportResponse?.exportQuery.id ?? null,
        response: exportResponse,
        error: exportError,
        info: exportInfo,
      };
    }

    if (exportError || !exportResponse || !exportResponse.exportQuery.id) {
      return {
        response: null,
        error: exportError,
        info: { ...exportInfo },
      };
    }
    const { id: taskId, filename } = exportResponse.exportQuery;

    const {
      response: taskResponse,
      error: taskError,
      info: taskInfo,
    } = await this.waitForTask(taskId);

    // TODO: use superstruct or something to verify JSON is as expected
    const parsedOutput = taskResponse?.output as ExportJobOutput;
    if (!parsedOutput.url) {
      throw new Error("output did not include url field as suspected");
    }

    return {
      response: {
        success: true,
        taskId,
        filename,
        // Let taskResponse fields take highest priority, except for output,
        // where we prefer our parsed (and typed) version to the raw JSON
        ...taskResponse,
        output: parsedOutput,
      },
      error: taskError,
      info: taskInfo,
    };
  }

  protected async startExport(
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
