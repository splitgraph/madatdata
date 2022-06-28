import type { Plugin } from "@madatdata/base-db";
import type { SplitgraphDestOptions } from "./base-import-plugin";

import { gql } from "graphql-request";

import { Retryable, BackOffPolicy } from "typescript-retry-decorator";

import { SplitgraphGraphQLClient } from "../../gql-client/splitgraph-graphql-client";

import type { Csv as CsvTableParamsSchema } from "./generated/csv/TableParamsSchema";
import type { Csv as CsvParamsSchema } from "./generated/csv/ParamsSchema";
import type { Csv as CsvCredentialsSchema } from "./generated/csv/CredentialsSchema";

import type {
  RepositoryIngestionJobStatusQuery,
  RepositoryIngestionJobStatusQueryVariables,
} from "./import-csv-plugin.generated";

interface ImportCSVDestOptions extends SplitgraphDestOptions {
  params?: CsvParamsSchema;
  tableName: SplitgraphDestOptions["tableName"];
  // TODO: support > 1 table
  tableParams?: CsvTableParamsSchema;
  credentials?: CsvCredentialsSchema;
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
export class ImportCSVPlugin implements Plugin {
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
    return new ImportCSVPlugin({
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
      {
        startExternalRepositoryLoad: {
          taskId: string;
        };
      },
      // TODO: This is painful. Add some graphql codegen with the remote schema.
      {
        namespace: string;
        repository: string;
        tables?: {
          name: string;
          options: JSONString;
          schema?: { name: string; pgType: string }[];
        }[];
        initialPermissions?: {
          visibility: "PRIVATE" | "PUBLIC";
        };
        pluginName?: "csv";
        params?: JSONString;
        credentialId?: never;
        sync?: false;
      }
    >(
      gql`
        mutation StartExternalRepositoryLoad(
          $namespace: String!
          $repository: String!
          $tables: [ExternalTableInput!]
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

  private async fetchPresignedURL() {
    const { response, error, info } = await this.graphqlClient.send<{
      csvUploadDownloadUrls: {
        upload: string;
        download: string;
      };
    }>(
      gql`
        query CSVURLs {
          csvUploadDownloadUrls {
            upload
            download
          }
        }
      `
    );

    return { response, error, info };
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
          $namespace: String
          $repository: String
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

  /**
   * NOTE: Splitgraph does not currently support multipart form data for CSV files,
   * because that requires fetching the presigned token with a multipart parameter,
   * and besides, there would be little benefit of this in the browser, because
   * we can already upload from a readable stream, but most browsers do not actually
   * support streaming uploads, so need to buffer it anyway.
   */
  private async uploadCSV(presignedUploadURL: string, payload: BodyInit) {
    // NOTE: We do not call this.transformRequestHeaders, because Minio will
    // respond with "invalid request" for unexpected headers like Authorization
    // (This emulates S3, i.e. minio handles authz itself, which we are already
    // using by generating pre-signed URLs only for authenticated users)
    const outboundHeaders = IdentityFunc({
      Accept: "application/xml",
      "Content-Type": "text/csv",
    }) as unknown as Record<string, string>;

    const { response, error } = await fetch(presignedUploadURL, {
      method: "PUT",
      body: payload,
      mode: "cors",
      headers: outboundHeaders,
    })
      .then((response) =>
        response.ok
          ? { response, error: null }
          : { response, error: { type: "http-error" } }
      )
      .catch((error) => ({
        response: null,
        error: { type: "network-error", ...error },
      }));

    return { response, error };
  }

  private async uploadData(
    sourceOptions: ImportCSVFromDataOptions,
    _destOptions: ImportCSVDestOptions
  ) {
    const info: {
      presigned?: typeof presignedInfo;
      uploadedTo?: string;
      presignedDownloadURL?: string;
      presignedUploadURL?: string;
      jobStatus?: any;
      jobLog?: { url: string };
    } = {};

    const {
      response,
      error,
      info: presignedInfo,
    } = await this.fetchPresignedURL();

    info.presigned = presignedInfo;

    if (error || !response) {
      return {
        response: null,
        error: error ?? { type: "unknown-error" },
        info,
      };
    }

    const {
      csvUploadDownloadUrls: {
        download: presignedDownloadURL,
        upload: presignedUploadURL,
      },
    } = response;

    const { response: uploadCSVResponse, error: uploadCSVError } =
      await this.uploadCSV(presignedUploadURL, sourceOptions.data);

    info.uploadedTo = presignedDownloadURL;
    info.presignedDownloadURL = presignedDownloadURL;
    info.presignedUploadURL = presignedUploadURL;

    if (uploadCSVError || !uploadCSVResponse) {
      return { response: uploadCSVResponse, error: uploadCSVError, info };
    }

    return {
      response: uploadCSVResponse ?? null,
      error: uploadCSVError
        ? { type: "upload-error", ...uploadCSVError }
        : null,
      info: info as Required<typeof info>,
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
    console.log(new Date().toLocaleTimeString(), "waitFor:", taskId);

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

  async importData(
    sourceOptions: ImportCSVSourceOptions,
    destOptions: ImportCSVDestOptions
  ) {
    // TODO: cleanup this hack with "import ctx" which is only here because
    // tests want to make assertions on headers of intermediate requests
    const importCtx: Pick<
      Unpromise<ReturnType<typeof this.uploadData>>,
      "info"
    > = {
      info: {},
    };

    if (sourceOptions.data) {
      const { response, error, info } = await this.uploadData(
        sourceOptions,
        destOptions
      );

      if (error || !response) {
        return { response, error, info };
      }

      // Now that we uploaded data to url, remove the data property and add url property
      sourceOptions = (({ data, ...withoutData }) => ({
        ...withoutData,
        url: info?.uploadedTo,
      }))(sourceOptions) as ImportCSVFromURLOptions;

      importCtx.info = { ...info };
    }

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

type JSONString = string;

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
