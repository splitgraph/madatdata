import type { ExportPlugin, WithOptionsInterface } from "@madatdata/base-db";
import {
  ExportFormat,
  type ExportJobOutput,
} from "../../gql-client/unified-types";

import { gql } from "graphql-request";
import type {
  StartExportJobMutation,
  StartExportJobMutationVariables,
} from "./export-query-plugin.generated";
import { SplitgraphExportPlugin } from "./base-export-plugin";

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

export class ExportQueryPlugin
  extends SplitgraphExportPlugin<
    "exportQuery",
    ExportQueryPlugin,
    ExportQuerySourceOptions,
    ExportQueryDestOptions,
    Record<string, unknown>,
    Awaited<ReturnType<ExportPlugin<"exportQuery">["exportData"]>>
  >
  implements
    ExportPlugin<"exportQuery">,
    WithOptionsInterface<ExportQueryPlugin>
{
  public readonly __name = "exportQuery";
  public static readonly __name = "exportQuery";

  async exportData(
    sourceOptions: ExportQuerySourceOptions,
    destOptions: ExportQueryDestOptions
  ) {
    const {
      response: exportResponse,
      error: exportError,
      info: exportInfo,
    } = await this.startExport(sourceOptions, destOptions);

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
