import type { ImportPlugin, WithOptionsInterface } from "@madatdata/base-db";

import { gql } from "graphql-request";

import { Retryable, BackOffPolicy } from "typescript-retry-decorator";

import { SplitgraphGraphQLClient } from "../../gql-client/splitgraph-graphql-client";

import type { Csv as CsvTableParamsSchema } from "./generated/csv/TableParamsSchema";
import type { Csv as CsvParamsSchema } from "./generated/csv/ParamsSchema";
import type { Csv as CsvCredentialsSchema } from "./generated/csv/CredentialsSchema";

import type {
  RepositoryIngestionJobStatusQuery,
  RepositoryIngestionJobStatusQueryVariables,
  StartExternalRepositoryLoadMutation,
  StartExternalRepositoryLoadMutationVariables,
} from "./splitgraph-import-csv-plugin.generated";

export type SplitgraphDestOptions = {
  namespace: string;
  repository: string;
  tableName: string;
};

interface ImportCSVDestOptions extends SplitgraphDestOptions {
  params?: CsvParamsSchema;
  tableName: SplitgraphDestOptions["tableName"];
  // TODO: support > 1 table
  tableParams?: CsvTableParamsSchema;
  credentials?: CsvCredentialsSchema;
  /* default private */
  initialPermissions?: StartExternalRepositoryLoadMutationVariables["initialPermissions"];
}

interface ImportCSVPluginOptions {
  graphqlEndpoint: string;
  transformRequestHeaders?: (requestHeaders: HeadersInit) => HeadersInit;
}

interface ImportCSVBaseOptions {
  // _type: "import-csv-base";
  // importType: "csv";
}

interface ImportCSVFromURLOptions extends ImportCSVBaseOptions {
  data?: never;
  url: string;

  presignedUploadURL?: never;
  presignedDownloadURL?: never;
}

interface ImportCSVFromDataOptions extends ImportCSVBaseOptions {
  data: BodyInit;
  url?: never;

  presignedUploadURL?: string;
  presignedDownloadURL?: string;
}

type ImportCSVSourceOptions =
  | ImportCSVFromURLOptions
  | ImportCSVFromDataOptions;

type DbInjectedOptions = Partial<ImportCSVPluginOptions>;

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

export class SplitgraphImportPlugin
  implements ImportPlugin, WithOptionsInterface<SplitgraphImportPlugin>
{
  public readonly __name = "csv";
  public static readonly __name = "csv";

  public readonly opts: ImportCSVPluginOptions;
  public readonly graphqlEndpoint: ImportCSVPluginOptions["graphqlEndpoint"];
  public readonly graphqlClient: SplitgraphGraphQLClient;
  public readonly transformRequestHeaders: Required<ImportCSVPluginOptions>["transformRequestHeaders"];

  constructor(opts: ImportCSVPluginOptions) {
    this.opts = opts;

    this.graphqlEndpoint = opts.graphqlEndpoint;
    this.transformRequestHeaders = opts.transformRequestHeaders ?? IdentityFunc;

    this.graphqlClient = new SplitgraphGraphQLClient({
      graphqlEndpoint: this.graphqlEndpoint,
      transformRequestHeaders: this.transformRequestHeaders,
    });
  }

  // TODO: improve it (e.g. allow either mutation or copy), and/or generalize it
  withOptions(injectOpts: DbInjectedOptions) {
    return new SplitgraphImportPlugin({
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

  private async startLoad(
    sourceOptions: ImportCSVFromURLOptions,
    destOptions: ImportCSVDestOptions
  ) {
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
        params: JSON.stringify({
          url: sourceOptions.url,
          connection_type: "http",
          ...destOptions.params,
        }),
        tables: [
          {
            name: destOptions.tableName,
            options: JSON.stringify({
              url: sourceOptions.url,
              ...destOptions.tableParams,
            }),
            // TODO: allow user to specify schema in destOptions
            schema: [],
          },
        ],
        pluginName: "csv",
      }
    );
  }

  private async fetchJobLog(
    taskId: string,
    {
      namespace,
      repository,
    }: Pick<ImportCSVDestOptions, "namespace" | "repository">
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
    }: Pick<ImportCSVDestOptions, "namespace" | "repository">
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
    }: Pick<ImportCSVDestOptions, "namespace" | "repository">
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
   * such as uploading a CSV file to object storage.
   */
  async beforeImport(
    _sourceOptions: ImportCSVSourceOptions,
    _destOptions: ImportCSVDestOptions
  ) {
    return Promise.resolve({
      response: null,
      error: null,
      info: {},
    });
  }

  async importData(
    sourceOptions: ImportCSVSourceOptions,
    destOptions: ImportCSVDestOptions
  ) {
    // TODO: cleanup this hack with "import ctx" which is only here because
    // tests want to make assertions on headers of intermediate requests
    const importCtx: Pick<
      Unpromise<ReturnType<typeof this.beforeImport>>,
      "info"
    > = {
      info: {},
    };

    sourceOptions = sourceOptions as ImportCSVFromURLOptions;

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

// TODO: Consider adding `type-fest`: https://github.com/sindresorhus/type-fest
// which has AsyncReturnValue<T> to replace Unpromise<ReturnType<T>>
type Unpromise<T extends Promise<any>> = T extends Promise<infer U> ? U : never;

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
