import type { DbOptions, Plugin } from "@madatdata/base-db";
import type { SplitgraphDestOptions } from "./base-import-plugin";

// TODO: next
import {
  type Variables,
  rawRequest,
  gql,
  GraphQLClient,
} from "graphql-request";

interface ImportCSVPluginOptions {
  graphqlEndpoint: string;
  transformRequestHeaders?: (requestHeaders: HeadersInit) => HeadersInit;
}

interface ImportCSVSourceOptions {
  url: string;
}

type DbInjectedOptions = Partial<ImportCSVPluginOptions>;

export class ImportCSVPlugin implements Plugin {
  public readonly opts: ImportCSVPluginOptions;
  public readonly graphqlEndpoint: ImportCSVPluginOptions["graphqlEndpoint"];
  public readonly graphqlClient: GraphQLClient;
  public readonly transformRequestHeaders: ImportCSVPluginOptions["transformRequestHeaders"];

  constructor(opts: ImportCSVPluginOptions) {
    this.opts = opts;
    this.graphqlEndpoint = opts.graphqlEndpoint;
    this.transformRequestHeaders = opts.transformRequestHeaders;

    this.graphqlClient = new GraphQLClient(this.graphqlEndpoint, {
      headers: this.transformRequestHeaders
        ? () => this.transformRequestHeaders?.({})
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

  async importData(
    _sourceOptions: ImportCSVSourceOptions,
    _destOptions: SplitgraphDestOptions
  ) {
    const { response, error, info } = await this.sendGraphql<{
      upload: string;
      download: string;
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

    return {
      response,
      error,
      info,
    };
  }
}
