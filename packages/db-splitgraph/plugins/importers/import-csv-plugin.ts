import type { Plugin } from "@madatdata/base-db";
import type { SplitgraphDestOptions } from "./base-import-plugin";

import { type Variables, gql, GraphQLClient } from "graphql-request";
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

export class ImportCSVPlugin implements Plugin {
  public readonly opts: ImportCSVPluginOptions;
  public readonly graphqlEndpoint: ImportCSVPluginOptions["graphqlEndpoint"];
  public readonly graphqlClient: GraphQLClient;
  public readonly transformRequestHeaders: Required<ImportCSVPluginOptions>["transformRequestHeaders"];

  constructor(opts: ImportCSVPluginOptions) {
    this.opts = opts;
    this.graphqlEndpoint = opts.graphqlEndpoint;
    this.transformRequestHeaders = opts.transformRequestHeaders ?? IdentityFunc;

    this.graphqlClient = new GraphQLClient(this.graphqlEndpoint, {
      headers: this.transformRequestHeaders
        ? () => this.transformRequestHeaders({})
        : {},
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

  private async sendGraphql<T = any, V = Variables>(
    query: string,
    variables?: V
  ) {
    const { response, error, info } = await this.graphqlClient
      .rawRequest<{
        upload: string;
        download: string;
      }>(query, variables)
      .then(({ data, headers, status }) => ({
        response: data as unknown as T,
        error: null,
        info: { headers, status },
      }))
      .catch((error) => ({ error, response: null, info: null }));

    return {
      response,
      error,
      info,
    };
  }

  private async fetchPresignedURL() {
    const { response, error, info } = await this.sendGraphql<{
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

  /**
   * NOTE: Splitgraph does not currently support multipart form data for CSV files,
   * because that requires fetching the presigned token with a multipart parameter,
   * and besides, there would be little benefit of this in the browser, because
   * we can already upload from a readable stream, but most browsers do not actually
   * support streaming uploads, so need to buffer it anyway.
   */
  private async uploadCSV(presignedUploadURL: string, payload: BodyInit) {
    const outboundHeaders = this.transformRequestHeaders({
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
    _destOptions: SplitgraphDestOptions
  ) {
    const info: {
      presigned?: typeof presignedInfo;
      uploadedTo?: string;
      presignedDownloadURL?: string;
      presignedUploadURL?: string;
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

  async importData(
    sourceOptions: ImportCSVSourceOptions,
    destOptions: SplitgraphDestOptions
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

    const url = sourceOptions.url;

    console.log("TODO: Create table from uploaded URL:", url);

    return {
      response: { success: true, uploadedTo: importCtx.info?.uploadedTo },
      error: null,
      info: {
        ...importCtx.info,
      },
    };
  }
}

const IdentityFunc = <T>(x: T) => x;

// TODO: Consider adding `type-fest`: https://github.com/sindresorhus/type-fest
// which has AsyncReturnValue<T> to replace Unpromise<ReturnType<T>>
type Unpromise<T extends Promise<any>> = T extends Promise<infer U> ? U : never;
