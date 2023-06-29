import type { ImportPlugin, WithOptionsInterface } from "@madatdata/base-db";

import { gql } from "graphql-request";

import { Retryable, BackOffPolicy } from "typescript-retry-decorator";

import { SplitgraphGraphQLClient } from "../../gql-client/splitgraph-graphql-client";

import type {
  RepositoryIngestionJobStatusQuery,
  RepositoryIngestionJobStatusQueryVariables,
  StartExternalRepositoryLoadMutation,
  StartExternalRepositoryLoadMutationVariables,
} from "./splitgraph-base-import-plugin.generated";
import type { DeferredTaskPlugin } from "@madatdata/base-db/base-db";

export type SplitgraphDestOptions = {
  namespace: string;
  repository: string;
  /* default is public */
  initialPermissions?: StartExternalRepositoryLoadMutationVariables["initialPermissions"];
};

export interface SplitgraphImportPluginOptions {
  graphqlEndpoint: string;
  transformRequestHeaders?: (requestHeaders: HeadersInit) => HeadersInit;
}

type DbInjectedOptions = Partial<SplitgraphImportPluginOptions>;

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

type ProvidedExternalLoadMutationVariables = Pick<
  StartExternalRepositoryLoadMutationVariables,
  "tables"
> &
  Partial<
    Omit<StartExternalRepositoryLoadMutationVariables, "tables" | "pluginName">
  >;

// We query for multple nods and then filter client-side for the node matching namespace and repository
type JobStatusNode = Exclude<
  RepositoryIngestionJobStatusQuery["repositoryIngestionJobStatus"],
  null
>["nodes"][number];

export type DeferredSplitgraphImportTask = {
  completed: boolean;
  response: {
    jobStatus: JobStatusNode | null;
    jobLog?: { url: string };
  } | null;
  error: "no response" | "failed status" | null | any;
  info: {
    jobStatus: { status: number; headers: any } | null;
    jobLog?: { status: number; headers: any } | null;
  } | null;
};

export abstract class SplitgraphImportPlugin<
  PluginName extends string,
  /** The "params" schema for the plugin, i.e. provided by auto-generated type */
  PluginParamsSchema extends object,
  /** The "table params" schema for the plugin, i.e. provided by auto-generated type */
  PluginTableParamsSchema extends object,
  /** The "credentials" schema for the plugin, i.e. provided by auto-generated type */
  PluginCredentialsSchema extends object,
  /** Concrete type of the derived class, for annotating return value of builder methods like withOptions */
  DerivedSplitgraphImportPlugin extends SplitgraphImportPlugin<
    PluginName,
    PluginParamsSchema,
    PluginTableParamsSchema,
    PluginCredentialsSchema,
    DerivedSplitgraphImportPlugin,
    StartedImportJob,
    CompletedImportJob,
    ConcreteImportDestOptions,
    ConcreteImportSourceOptions
  >,
  StartedImportJob extends object,
  CompletedImportJob extends Awaited<
    ReturnType<ImportPlugin<PluginName>["importData"]>
  >,
  ConcreteImportDestOptions extends SplitgraphDestOptions = SplitgraphDestOptions,
  ConcreteImportSourceOptions extends object = Record<string, never>
> implements
    ImportPlugin<PluginName>,
    DeferredTaskPlugin<PluginName, DeferredSplitgraphImportTask>,
    WithOptionsInterface<DerivedSplitgraphImportPlugin>
{
  public abstract readonly __name: PluginName;

  // TODO: make sense? will be overridden?
  // public static readonly __name: PluginName;

  // TODO: deleted because static property doesn't make sense on abstract class? cannot have static property
  // public static readonly __name = "csv";
  public readonly opts: SplitgraphImportPluginOptions;
  public readonly graphqlEndpoint: SplitgraphImportPluginOptions["graphqlEndpoint"];
  public readonly graphqlClient: SplitgraphGraphQLClient;
  public readonly transformRequestHeaders: Required<SplitgraphImportPluginOptions>["transformRequestHeaders"];

  constructor(opts: SplitgraphImportPluginOptions) {
    this.opts = opts;

    this.graphqlEndpoint = opts.graphqlEndpoint;
    this.transformRequestHeaders = opts.transformRequestHeaders ?? IdentityFunc;

    this.graphqlClient = new SplitgraphGraphQLClient({
      graphqlEndpoint: this.graphqlEndpoint,
      transformRequestHeaders: this.transformRequestHeaders,
    });
  }

  /**
   * Builder method to return a new instance of the derived class with the given
   * options merged with any existng options in the current instance. The returned
   * object will be an instance of the derived class (DerivedSplitgraphImportPlugin),
   * as returned by `Object.getPrototypeOf(this).constructor()`
   */
  withOptions(injectOpts: DbInjectedOptions): DerivedSplitgraphImportPlugin {
    const mergedInjectOpts: SplitgraphImportPluginOptions = {
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

  public async importData(
    rawSourceOptions: ConcreteImportSourceOptions,
    rawDestOptions: ConcreteImportDestOptions,
    importOptions?: { defer: boolean }
  ) {
    const {
      sourceOptions = rawSourceOptions,
      destOptions = rawDestOptions,
      ...importCtx
    } = await this.beforeImport(rawSourceOptions, rawDestOptions);

    const {
      response: loadResponse,
      error: loadError,
      info: loadInfo,
    } = await this.startLoad(sourceOptions, destOptions);

    if (loadError || !loadResponse) {
      return {
        ...(importOptions?.defer ? { taskId: null } : {}),
        response: null,
        error: loadError,
        info: { ...importCtx.info, ...loadInfo },
      };
    }

    const { taskId } = loadResponse.startExternalRepositoryLoad;

    if (importOptions?.defer) {
      return {
        taskId,
        response: loadResponse,
        error: loadError ?? null,
        info: { ...importCtx.info, ...loadInfo },
      };
    }

    const { response: statusResponse, error: statusError } =
      await this.waitForTask(taskId, destOptions);

    const lastKnownJobStatus = statusResponse?.jobStatus.status;

    const info = {
      ...importCtx.info,
      ...statusResponse,
    };

    if (lastKnownJobStatus != TaskStatus.Success) {
      return {
        response: {
          success: false,
        },
        error: {
          success: false,
          pending: lastKnownJobStatus && taskUnresolved(lastKnownJobStatus),
          ...statusError,
        },
        info,
      };
    }

    return {
      response: {
        success: true,
      },
      error: null,
      info,
    };
  }

  /**
   * Return the params and tables variable for the load
   */
  protected abstract makeLoadMutationVariables(
    sourceOptions: ConcreteImportSourceOptions,
    destOptions: ConcreteImportDestOptions
  ): ProvidedExternalLoadMutationVariables;

  // TODO: Clean this up to use an intermediate private member inside the derived class
  // instead of passing some magical object through some magical pipeline

  /**
   * Derived classes should implement this method to perform any pre-import steps,
   * such as uploading a CSV file to object storage. It should return sourceOptions
   * and destOptions if they are mutated in the process.
   */
  protected async beforeImport(
    sourceOptions: ConcreteImportSourceOptions,
    destOptions: ConcreteImportDestOptions
  ): Promise<{
    response: null | Response;
    error: unknown;
    info: object;
    sourceOptions: ConcreteImportSourceOptions;
    destOptions: ConcreteImportDestOptions;
  }> {
    return Promise.resolve({
      sourceOptions,
      destOptions,
      info: {},
      response: null,
      error: null,
    });
  }

  // TODO: preview step should return available table names

  private async startLoad(
    sourceOptions: ConcreteImportSourceOptions,
    destOptions: ConcreteImportDestOptions
  ) {
    const { tables, ...optionalVariables } = this.makeLoadMutationVariables(
      sourceOptions,
      destOptions
    );

    return this.graphqlClient.send<
      StartExternalRepositoryLoadMutation,
      StartExternalRepositoryLoadMutationVariables
    >(
      gql`
        mutation StartExternalRepositoryLoad(
          $namespace: String!
          $repository: String!
          $tables: [ExternalTableInput!]!
          $initialPermissions: InitialPermissions
          $pluginName: String
          $params: JSON
          $credentialId: String
          $credentialData: JSON
          $sync: Boolean
        ) {
          startExternalRepositoryLoad(
            namespace: $namespace
            repository: $repository
            pluginName: $pluginName
            params: $params
            initialPermissions: $initialPermissions
            tables: $tables
            credentialId: $credentialId
            credentialData: $credentialData
            sync: $sync
          ) {
            taskId
          }
        }
      `,
      {
        // Only required variable, but can be empty list to indicate loading all tables
        tables,
        // Not required or passable, because it must be same as this.__name
        pluginName: this.__name,
        // These are required, but we default to destOptions.{namespace,repository}
        namespace: optionalVariables.namespace ?? destOptions.namespace,
        repository: optionalVariables.repository ?? destOptions.repository,
        // Truly optional variables
        params: optionalVariables.params ?? {},
        credentialData: optionalVariables.credentialData ?? undefined,
        initialPermissions: destOptions.initialPermissions ?? undefined,
        credentialId: optionalVariables.credentialId ?? undefined,
        sync: optionalVariables.sync ?? undefined,
      }
    );
  }

  private async fetchJobLog(
    taskId: string,
    {
      namespace,
      repository,
    }: Pick<ConcreteImportDestOptions, "namespace" | "repository">
  ) {
    const { response, error, info } = await this.graphqlClient.send<
      {
        jobLogs: {
          url: string;
        };
      },
      { namespace: string; repository: string; taskId: string }
    >(
      gql`
        query JobLogsByTaskId(
          $namespace: String!
          $repository: String!
          $taskId: String!
        ) {
          jobLogs(
            namespace: $namespace
            repository: $repository
            taskId: $taskId
          ) {
            url
          }
        }
      `,
      {
        namespace,
        repository,
        taskId,
      }
    );

    if (error || !response?.jobLogs) {
      return {
        response: null,
        error,
        info,
      };
    }

    return {
      response: {
        url: response.jobLogs.url,
      },
      error: null,
      info,
    };
  }

  private async fetchIngestionJobStatus(
    taskId: string,
    {
      namespace,
      repository,
    }: Pick<ConcreteImportDestOptions, "namespace" | "repository">
  ) {
    const { response, error, info } = await this.graphqlClient.send<
      RepositoryIngestionJobStatusQuery,
      RepositoryIngestionJobStatusQueryVariables
    >(
      // NOTE: Splitgraph GQL API has no resolver for ingestion job by taskId,
      // so we fetch last 10 jobLogs to safely find the one matching taskId,
      // although it should almost always be the first (most recent) job.
      gql`
        query RepositoryIngestionJobStatus(
          $namespace: String!
          $repository: String!
        ) {
          repositoryIngestionJobStatus(
            first: 10
            namespace: $namespace
            repository: $repository
          ) {
            nodes {
              taskId
              started
              finished
              isManual
              status
            }
          }
        }
      `,
      {
        namespace,
        repository,
      }
    );

    if (error || !response) {
      return { response: null, error, info };
    }

    // FIXME(codegen): This ? shouldn't be necessary
    const matchingJob = response.repositoryIngestionJobStatus?.nodes.find(
      (node) => node.taskId === taskId
    );

    if (!matchingJob) {
      return { response: null, error: null, info };
    }

    return {
      response: matchingJob,
      error: null,
      info,
    };
  }

  public async pollDeferredTask({
    taskId,
    namespace,
    repository,
  }: {
    taskId: string;
    namespace: string;
    repository: string;
  }): Promise<DeferredSplitgraphImportTask> {
    try {
      const taskStatus = await this.waitForTaskOnce(taskId, {
        namespace,
        repository,
      });

      return {
        completed: true,
        ...taskStatus,
      };
    } catch (err) {
      if (
        typeof err === "object" &&
        err !== null &&
        "type" in err &&
        (err as { type: "retry"; response: JobStatusNode }).type === "retry"
      ) {
        return {
          completed: false,
          error: null, // it's just a retry, so we don't include error
          response: {
            jobStatus:
              "response" in err
                ? (err as { response: JobStatusNode }).response
                : null,
          },
          info: null,
        };
      } else {
        // We got an unknown/unexpected error (basically, caught something that was not retry)
        return {
          completed: true,
          error: err,
          response: null,
          info: null,
        };
      }
    }
  }

  @Retryable({
    ...retryOptions,
    doRetry: ({ type }) => type === "retry",
  })
  private async waitForTask(
    taskId: string,
    {
      namespace,
      repository,
    }: Pick<ConcreteImportDestOptions, "namespace" | "repository">
  ) {
    return await this.waitForTaskOnce(taskId, { namespace, repository });
  }

  private async waitForTaskOnce(
    taskId: string,
    {
      namespace,
      repository,
    }: Pick<ConcreteImportDestOptions, "namespace" | "repository">
  ) {
    const {
      response: jobStatusResponse,
      error: jobStatusError,
      info: jobStatusInfo,
    } = await this.fetchIngestionJobStatus(taskId, {
      namespace,
      repository,
    });

    if (jobStatusError) {
      return {
        response: null,
        error: jobStatusError,
        info: { jobStatus: jobStatusInfo },
      };
    } else if (!jobStatusResponse) {
      throw { type: "retry" };
      // FIXME(codegen): this shouldn't be nullable
    } else if (taskUnresolved(jobStatusResponse.status!)) {
      throw { type: "retry", response: jobStatusResponse };
    }

    const {
      response: jobLogResponse,
      error: jobLogError,
      info: jobLogInfo,
    } = await this.fetchJobLog(taskId, { namespace, repository });

    if (jobLogError || !jobLogResponse) {
      return {
        response: null,
        error: jobLogError,
        info: { jobLog: jobLogInfo, jobStatus: jobStatusInfo },
      };
    }

    return {
      response: {
        jobStatus: jobStatusResponse,
        jobLog: jobLogResponse,
      },
      error: null,
      info: {
        jobStatus: jobStatusInfo,
        jobLog: jobLogInfo,
      },
    };
  }
}

const IdentityFunc = <T>(x: T) => x;

enum TaskStatus {
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

const standbyStatuses = [TaskStatus.Pending, TaskStatus.Started];

// const unrecoverableStatuses = [
//   TaskStatus.Failure,
//   TaskStatus.Revoked,
//   TaskStatus.Lost,
//   TaskStatus.TimedOut,
// ];

// const unexpectedStatuses = [
//   TaskStatus.Retry,
//   TaskStatus.Received,
//   TaskStatus.Rejected,
//   TaskStatus.Ignored,
// ];

const taskUnresolved = (ts: TaskStatus) => standbyStatuses.includes(ts);

// const taskNotRecoverable = (ts: TaskStatus) =>
//   unrecoverableStatuses.includes(ts);

// const taskHasKnownButUnexpectedStatus = (ts: TaskStatus) =>
//   unexpectedStatuses.includes(ts);

// type SomeOptional<T, OptionalKeys extends keyof T> = Omit<T, OptionalKeys> &
//   Pick<Partial<T>, OptionalKeys>;