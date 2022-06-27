// import { type Variables, gql, GraphQLClient } from "graphql-request";
import { GraphQLClient } from "graphql-request";

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
}

const IdentityFunc = <T>(x: T) => x;
