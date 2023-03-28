import type { ExportPlugin, WithOptionsInterface } from "@madatdata/base-db";
import { SplitgraphGraphQLClient } from "../../gql-client/splitgraph-graphql-client";
import {
  ExportFormat,
  type ExportJobOutput,
} from "../../gql-client/unified-types";
import { Retryable, BackOffPolicy } from "typescript-retry-decorator";

import { gql } from "graphql-request";
import type {
  StartExportJobMutation,
  StartExportJobMutationVariables,
  ExportJobStatusQuery,
  ExportJobStatusQueryVariables,
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

// 1 hour
const MAX_POLL_TIMEOUT = 1_000 * 60 * 60;
// const MAX_ATTEMPTS = MAX_POLL_TIMEOUT - (25.5 * 1000) / 10000;
const MAX_BACKOFF_INTERVAL = 10_000;
const MAX_ATTEMPTS = Math.ceil(
  (MAX_POLL_TIMEOUT - 25.5 * 1_000) / MAX_BACKOFF_INTERVAL
);
const retryOptions = {
  maxAttempts: MAX_ATTEMPTS,
  backOff: 500,
  backOffPolicy: BackOffPolicy.ExponentialBackOffPolicy,
  exponentialOption: { maxInterval: MAX_BACKOFF_INTERVAL, multiplier: 2 },
};
export class ExportQueryPlugin
  implements ExportPlugin, WithOptionsInterface<ExportQueryPlugin>
{
  private readonly opts: ExportQueryPluginOptions;
  public readonly graphqlEndpoint: ExportQueryPluginOptions["graphqlEndpoint"];
  public readonly graphqlClient: SplitgraphGraphQLClient;
  public readonly transformRequestHeaders: Required<ExportQueryPluginOptions>["transformRequestHeaders"];

  public readonly __name = "exportQuery";
  public static readonly __name = "exportQuery";

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

  // TODO: DRY (with at least splitgraph-import-csv-plugin)
  @Retryable({
    ...retryOptions,
    doRetry: ({ type }) => type === "retry",
  })
  private async waitForTask(taskId: string) {
    const {
      response: jobStatusResponse,
      error: jobStatusError,
      info: jobStatusInfo,
    } = await this.fetchExportJobStatus(taskId);

    if (jobStatusError) {
      return {
        response: null,
        error: jobStatusError,
        info: { jobStatus: jobStatusInfo },
      };
    } else if (!jobStatusResponse) {
      throw { type: "retry" };
      // FIXME(codegen): this shouldn't be nullable
    } else if (taskUnresolved(jobStatusResponse.status as ExportTaskStatus)) {
      throw { type: "retry" };
    }

    return {
      response: jobStatusResponse,
      error: jobStatusError,
      info: jobStatusInfo,
    };
  }

  private async fetchExportJobStatus(taskId: string) {
    const { response, error, info } = await this.graphqlClient.send<
      ExportJobStatusQuery,
      ExportJobStatusQueryVariables
    >(
      gql`
        query ExportJobStatus($taskId: UUID!) {
          exportJobStatus(taskId: $taskId) {
            status
            started
            finished
            exportFormat
            output
          }
        }
      `,
      {
        taskId: taskId,
      }
    );

    if (error || !response) {
      return { response: null, error, info };
    }

    return {
      response: response.exportJobStatus,
      error: null,
      info,
    };
  }
}

const IdentityFunc = <T>(x: T) => x;

enum ExportTaskStatus {
  // Standard Celery statuses
  Pending = "PENDING",
  Started = "STARTED",
  Success = "SUCCESS",
  Failure = "FAILURE",
  Revoked = "REVOKED",

  // Custom Splitgraph statuses
  Lost = "LOST",
  TimedOut = "TIMED_OUT",

  // Currently unused statuses
  Retry = "RETRY",
  Received = "RECEIVED",
  Rejected = "REJECTED",
  Ignored = "IGNORED",
}

const standbyStatuses = [ExportTaskStatus.Pending, ExportTaskStatus.Started];

const taskUnresolved = (ts: ExportTaskStatus) => standbyStatuses.includes(ts);
