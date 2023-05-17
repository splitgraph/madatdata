import type { ImportPlugin, WithOptionsInterface } from "@madatdata/base-db";
import { gql } from "graphql-request";

import type { CsvParamsSchema } from "./generated/csv/ParamsSchema";
import type { CsvTableParamsSchema } from "./generated/csv/TableParamsSchema";
import type { CsvCredentialsSchema } from "./generated/csv/CredentialsSchema";

import {
  SplitgraphDestOptions,
  SplitgraphImportPlugin,
} from "./splitgraph-base-import-plugin";

// NOTE: CSV only supports loading one table at a time
// TODO: maybe go back kto importing this or using a generic from splitgraph-base-import-plugin
//       to share the commonalities (e.g. for single-table: tableName; multi-table: tables, etc.)
interface ImportCSVDestOptions extends SplitgraphDestOptions {
  tableName: string;
  tableParams?: CsvTableParamsSchema;
  credentials?: CsvCredentialsSchema;
}

// TODO: should params always be required? and therefore part of an imported generic
interface ImportCSVBaseOptions {
  params?: CsvParamsSchema;
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

export class SplitgraphImportCSVPlugin
  extends SplitgraphImportPlugin<
    "csv",
    CsvParamsSchema,
    CsvTableParamsSchema,
    CsvCredentialsSchema,
    SplitgraphImportCSVPlugin,
    ImportCSVDestOptions,
    ImportCSVSourceOptions
  >
  implements
    ImportPlugin<"csv">,
    WithOptionsInterface<SplitgraphImportCSVPlugin>
{
  public readonly __name = "csv";
  public static readonly __name = "csv";

  private async fetchPresignedURL() {
    const { response, error, info } = await this.graphqlClient.send<{
      fileUploadDownloadUrls: {
        upload: string;
        download: string;
      };
    }>(
      gql`
        query FileURLs {
          fileUploadDownloadUrls {
            upload
            download
          }
        }
      `
    );

    return { response, error, info };
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
      fileUploadDownloadUrls: {
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

  protected makeLoadMutationVariables(
    sourceOptions: ImportCSVSourceOptions,
    destOptions: ImportCSVDestOptions
  ) {
    return {
      params: JSON.stringify({
        url: sourceOptions.url,
        connection_type: "http",
        ...sourceOptions.params,
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
    };
  }

  protected async beforeImport(
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
        return Promise.resolve({
          response,
          error,
          info,
          sourceOptions,
          destOptions,
        });
      }

      // Now that we uploaded data to url, remove the data property and add url property
      sourceOptions = (({ data, ...withoutData }) => ({
        ...withoutData,
        url: info?.uploadedTo,
      }))(sourceOptions) as ImportCSVFromURLOptions;

      importCtx.info = { ...info };
    }

    return Promise.resolve({
      response: null,
      error: null,
      info: importCtx.info,
      sourceOptions,
      destOptions,
    });
  }
}

const IdentityFunc = <T>(x: T) => x;

// TODO: Consider adding `type-fest`: https://github.com/sindresorhus/type-fest
// which has AsyncReturnValue<T> to replace Unpromise<ReturnType<T>>
type Unpromise<T extends Promise<any>> = T extends Promise<infer U> ? U : never;
