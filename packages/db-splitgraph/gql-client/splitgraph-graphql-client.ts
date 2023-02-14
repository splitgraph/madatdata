import { type Variables, GraphQLClient } from "graphql-request";

export interface SplitgraphGQLCLientOptions {
  graphqlEndpoint: string;
  transformRequestHeaders?: (requestHeaders: HeadersInit) => HeadersInit;
}

export class SplitgraphGraphQLClient {
  public readonly transformRequestHeaders: Required<SplitgraphGQLCLientOptions>["transformRequestHeaders"];
  public readonly graphqlClient: GraphQLClient;
  public readonly graphqlEndpoint: SplitgraphGQLCLientOptions["graphqlEndpoint"];

  constructor(opts: SplitgraphGQLCLientOptions) {
    this.graphqlEndpoint = opts.graphqlEndpoint;
    this.transformRequestHeaders = opts.transformRequestHeaders ?? IdentityFunc;

    this.graphqlClient = new GraphQLClient(this.graphqlEndpoint, {
      headers: () => this.transformRequestHeaders({}),
    });
  }

  public async send<T = any, V extends Variables = Variables>(
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
      .catch((error) => ({ error: { ...error }, response: null, info: null }));

    return {
      response,
      error,
      info,
    };
  }
}

const IdentityFunc = <T>(x: T) => x;
