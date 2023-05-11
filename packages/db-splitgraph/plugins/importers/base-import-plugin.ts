import type { ImportPlugin, WithOptionsInterface } from "@madatdata/base-db";

import { gql } from "graphql-request";

import { Retryable, BackOffPolicy } from "typescript-retry-decorator";

import { SplitgraphGraphQLClient } from "../../gql-client/splitgraph-graphql-client";

import type {
  RepositoryIngestionJobStatusQuery,
  RepositoryIngestionJobStatusQueryVariables,
  StartExternalRepositoryLoadMutation,
  StartExternalRepositoryLoadMutationVariables,
} from "./base-import-plugin.generated";

export type SplitgraphDestOptions = {
  namespace: string;
  repository: string;
  tableName: string;
};

export interface ImportDestOptions<
  TableParamsSchema extends object,
  CredentialsSchema extends object
> extends SplitgraphDestOptions {
  // TODO: note this is duplicated (idk why lol... think it's as a hack while supporting only 1 table)
  params?: TableParamsSchema;
  tableName: SplitgraphDestOptions["tableName"];

  // TODO: support > 1 table
  tableParams?: TableParamsSchema;
  credentials?: CredentialsSchema;
  /* default private */
  initialPermissions?: StartExternalRepositoryLoadMutationVariables["initialPermissions"];
}

interface SplitgraphImportPluginOptions {
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

export abstract class SplitgraphImportPlugin<
  /** The "table params" schema for the plugin, i.e. provided by auto-generated type */
  PluginTableParamsSchema extends object,
  /** The "credentials" schema for the plugin, i.e. provided by auto-generated type */
  PluginCredentialsSchema extends object,
  /** Concrete type of the derived class, for annotating return value of builder methods like withOptions */
  DerivedSplitgraphImportPlugin extends SplitgraphImportPlugin<
    PluginTableParamsSchema,
    PluginCredentialsSchema,
    DerivedSplitgraphImportPlugin,
    ConcreteImportDestOptions,
    ConcreteImportSourceOptions
  >,
  ConcreteImportDestOptions extends ImportDestOptions<
    PluginTableParamsSchema,
    PluginCredentialsSchema
  > = ImportDestOptions<PluginTableParamsSchema, PluginCredentialsSchema>,
  ConcreteImportSourceOptions extends object = Record<string, never>
> implements ImportPlugin, WithOptionsInterface<DerivedSplitgraphImportPlugin>
{
  public abstract readonly __name: string;

  // NOTE: Bit of a hack. Derived class should store reference to itself here, so
  // that the parent class can define a builder method (like withOptions) that
  // returns a new instance of the derived class.
  public abstract readonly DerivedClass: new (
    ...args: ConstructorParameters<typeof SplitgraphImportPlugin>
  ) => DerivedSplitgraphImportPlugin;

  // TODO: make sense? will be overridden?
  public static readonly __name: string;

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
   * Return a new instance of the derived class with the given options merged
   * with any existng objects in the current instance.
   *
   * NOTE: Requires DerivedClass to be set (kind of a hack)
   */
  withOptions(injectOpts: DbInjectedOptions): DerivedSplitgraphImportPlugin {
    // This implements the "builder pattern" in a way that the abstract class
    // can define the method, by using the stored reference of this.DerivedClass
    return new this.DerivedClass({
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
    });
  }

  /**
   * Return the params and tables variable for the load
   */
  protected abstract makeLoadMutationVariables(
    sourceOptions: ConcreteImportSourceOptions,
    destOptions: ConcreteImportDestOptions
  ): Pick<
    StartExternalRepositoryLoadMutationVariables,
    "params" | "tables" | "pluginName"
  >;

  private async startLoad(
    sourceOptions: ConcreteImportSourceOptions,
    destOptions: ConcreteImportDestOptions
  ) {
    const { params, tables, pluginName } = this.makeLoadMutationVariables(
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
            sync: $sync
          ) {
            taskId
          }
        }
      `,
      {
        initialPermissions: destOptions.initialPermissions,
        // NOTE: Optional params are required for typescript, ignored when sent
        credentialId: undefined,
        sync: undefined,
        namespace: destOptions.namespace,
        repository: destOptions.repository,
        params,
        tables,
        pluginName,
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
      throw { type: "retry" };
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

  /**
   * Derived classes should implement this method to perform any pre-import steps,
   * such as uploading a CSV file to object storage. It should return sourceOptions
   * and destOptions if they are mutated in the process.
   */
  async beforeImport(
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

  async importData(
    rawSourceOptions: ConcreteImportSourceOptions,
    rawDestOptions: ConcreteImportDestOptions
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
        response: null,
        error: loadError,
        info: { ...importCtx.info, ...loadInfo },
      };
    }

    const { taskId } = loadResponse.startExternalRepositoryLoad;

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
