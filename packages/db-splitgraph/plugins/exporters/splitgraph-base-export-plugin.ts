import type { ExportPlugin, WithOptionsInterface } from "@madatdata/base-db";
import { SplitgraphGraphQLClient } from "../../gql-client/splitgraph-graphql-client";
import { Retryable, BackOffPolicy } from "typescript-retry-decorator";

import { gql } from "graphql-request";
import type {
  ExportJobStatusQuery,
  ExportJobStatusQueryVariables,
} from "./splitgraph-base-export-plugin.generated";
import type { DeferredTaskPlugin } from "@madatdata/base-db/base-db";

// from unified spec
// type _ExportJobStatus = "status" | "finished" | "output" | "started";

interface SplitgraphExportPluginOptions {
  graphqlEndpoint: string;
  transformRequestHeaders?: (requestHeaders: HeadersInit) => HeadersInit;
}
type DbInjectedOptions = Partial<SplitgraphExportPluginOptions>;

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

export type DeferredSplitgraphExportTask = {
  completed: boolean;
  response: Extract<ExportJobStatusQuery["exportJobStatus"], object> | null;
  error: "no response" | "failed status" | null | any;
  info: { jobStatus: { status: number; headers: any } | null } | null;
};

export abstract class SplitgraphExportPlugin<
  PluginName extends string,
  /** Concrete type of the derived class, for annotating return value of builder methods like withOptions */
  DerivedSplitgraphExportPlugin extends SplitgraphExportPlugin<
    PluginName,
    DerivedSplitgraphExportPlugin,
    ConcreteExportSourceOptions,
    ConcreteExportDestOptions,
    StartedExportJob,
    CompletedExportJob
  >,
  ConcreteExportSourceOptions extends object,
  ConcreteExportDestOptions extends object,
  StartedExportJob extends object,
  CompletedExportJob extends Awaited<
    ReturnType<ExportPlugin<PluginName>["exportData"]>
  >
> implements
    ExportPlugin<PluginName>,
    DeferredTaskPlugin<PluginName, DeferredSplitgraphExportTask>,
    WithOptionsInterface<DerivedSplitgraphExportPlugin>
{
  public abstract readonly __name: PluginName;

  private readonly opts: SplitgraphExportPluginOptions;
  public readonly graphqlEndpoint: SplitgraphExportPluginOptions["graphqlEndpoint"];
  public readonly graphqlClient: SplitgraphGraphQLClient;
  public readonly transformRequestHeaders: Required<SplitgraphExportPluginOptions>["transformRequestHeaders"];

  // TODO: make sense? will be overridden?
  // public static readonly __name: PluginName;

  constructor(opts: SplitgraphExportPluginOptions) {
    this.opts = opts;

    this.graphqlEndpoint = opts.graphqlEndpoint;
    this.transformRequestHeaders = opts.transformRequestHeaders ?? IdentityFunc;

    this.graphqlClient = new SplitgraphGraphQLClient({
      graphqlEndpoint: this.graphqlEndpoint,
      transformRequestHeaders: this.transformRequestHeaders,
    });
  }

  // TODO: DRY with other plugins
  withOptions(injectOpts: DbInjectedOptions): DerivedSplitgraphExportPlugin {
    const mergedInjectOpts: SplitgraphExportPluginOptions = {
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
    };

    return new (Object.getPrototypeOf(this).constructor)(mergedInjectOpts);
  }

  public abstract exportData(
    sourceOptions: ConcreteExportSourceOptions,
    destOptions: ConcreteExportDestOptions
  ): Promise<CompletedExportJob>;

  public abstract exportData<Deferred extends boolean>(
    sourceOptions: ConcreteExportSourceOptions,
    destOptions: ConcreteExportDestOptions,
    exportOptions: { defer: Deferred }
  ): Deferred extends true
    ? Promise<{ taskId: string | null } & StartedExportJob>
    : Promise<CompletedExportJob>;

  protected abstract startExport(
    sourceOptions: ConcreteExportSourceOptions,
    destOptions: ConcreteExportDestOptions
  ): Promise<StartedExportJob>;

  public async pollDeferredTask({
    taskId,
  }: {
    taskId: string;
  }): Promise<DeferredSplitgraphExportTask> {
    const {
      response: jobStatusResponse,
      error: jobStatusError,
      info: jobStatusInfo,
    } = await this.fetchExportJobStatus(taskId);

    if (jobStatusError) {
      return {
        completed: true,
        response: null,
        error: jobStatusError,
        info: { jobStatus: jobStatusInfo },
      };
    } else if (!jobStatusResponse) {
      return {
        completed: false,
        response: null,
        error: "no response",
        info: { jobStatus: jobStatusInfo },
      };
    } else if (taskUnresolved(jobStatusResponse.status as ExportTaskStatus)) {
      return {
        completed: false,
        response: jobStatusResponse,
        error: null,
        info: { jobStatus: jobStatusInfo },
      };
    } else if (taskFailed(jobStatusResponse.status as ExportTaskStatus)) {
      return {
        completed: true,
        response: jobStatusResponse,
        error: "failed status",
        info: { jobStatus: jobStatusInfo },
      };
    }
    return {
      completed: true,
      response: jobStatusResponse,
      error: jobStatusError,
      info: { jobStatus: jobStatusInfo },
    };
  }

  // TODO: DRY (with at least splitgraph-import-csv-plugin)
  // TODO: use pollDeferredTask (is it equivalent?)
  @Retryable({
    ...retryOptions,
    doRetry: ({ type }) => type === "retry",
  })
  protected async waitForTask(taskId: string) {
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

const failedStatuses = [
  ExportTaskStatus.Failure,
  ExportTaskStatus.Revoked,
  ExportTaskStatus.Lost,
  ExportTaskStatus.TimedOut,
  ExportTaskStatus.Retry,
  ExportTaskStatus.Rejected,
  ExportTaskStatus.Ignored,
];

const taskFailed = (ts: ExportTaskStatus) => failedStatuses.includes(ts);

const standbyStatuses = [ExportTaskStatus.Pending, ExportTaskStatus.Started];

const taskUnresolved = (ts: ExportTaskStatus) => standbyStatuses.includes(ts);
