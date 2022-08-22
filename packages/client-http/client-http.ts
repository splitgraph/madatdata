import {
  BaseClient,
  makeAuthHeaders,
  type QueryError,
  type ClientOptions,
  type CredentialOptions,
  type Database,
  type Host,
  type UnknownCredential,
  UnknownRowShape,
  ExecutionResultWithObjectShapedRows,
  ExecutionResultWithArrayShapedRows,
  UnknownArrayShape,
  UnknownObjectShape,
} from "@madatdata/base-client";

export interface WebBridgeResponse<RowShape extends UnknownRowShape> {
  command: string;
  fields: {
    columnID: number;
    dataTypeID: number;
    dataTypeModifier: number;
    dataTypeSize: number;
    format: string;
    formattedType: string;
    name: string;
    tableID: number;
  }[];
  rowCount: 1;
  rows: RowShape[];
  success: true;
  /** FIXME: optional to allow deleting it for inline snapshots */
  executionTime?: string;
  /** FIXME: optional to allow deleting it for inline snapshots */
  executionTimeHighRes?: string;
}

type BodyMode = "json" | "jsonl";

type FetchOptionsStrategyArgs = {
  credential: UnknownCredential;
  query: string;
};

type FetchOptionsStrategy = ({
  credential,
  query,
}: FetchOptionsStrategyArgs) => RequestInit;

type MakeQueryURLStrategyArgs = {
  database: Database;
  host: Host;
  query?: string;
};

type MakeQueryURLStrategy = ({
  database,
  host,
}: MakeQueryURLStrategyArgs) => Promise<string>;

export type Strategies = {
  makeFetchOptions: FetchOptionsStrategy;
  makeQueryURL: MakeQueryURLStrategy;
};

type HTTPClientOptions = {
  bodyMode?: BodyMode;
  strategies?: Partial<Strategies>;
};

type BaseExecOptions = {
  bodyMode?: BodyMode;
};

export class SqlHTTPClient<
  InputCredentialOptions extends CredentialOptions
> extends BaseClient<InputCredentialOptions, Strategies> {
  private bodyMode: BodyMode;

  constructor(opts: ClientOptions<Strategies> & HTTPClientOptions) {
    super(opts);

    this.bodyMode = opts.bodyMode ?? "json";

    this.strategies = {
      makeFetchOptions:
        opts.strategies?.makeFetchOptions ?? this.defaultMakeFetchOptions,
      makeQueryURL: opts.strategies?.makeQueryURL ?? this.defaultMakeQueryURL,
    };
  }

  private async makeQueryURL({ query }: Partial<MakeQueryURLStrategyArgs>) {
    return await this.strategies.makeQueryURL({
      query,
      host: this.host,
      database: this.database,
    });
  }

  private makeFetchOptions({ query }: { query: string }) {
    return this.strategies.makeFetchOptions({
      credential: this.credential,
      query,
    });
  }

  private async defaultMakeQueryURL({
    host,
    database,
  }: MakeQueryURLStrategyArgs) {
    await Promise.resolve(); /* avoid warnings (default not async, but async ok) */

    return host.baseUrls.sql + "/" + database.dbname;
  }

  private defaultMakeFetchOptions({ credential }: FetchOptionsStrategyArgs) {
    return {
      method: "POST",
      headers: {
        ...makeAuthHeaders(credential),
        "Content-type": "application/json",
      },
    } as RequestInit;
  }

  async execute<RowShape extends UnknownArrayShape>(
    query: string,
    executeOptions: { rowMode: "array" } & BaseExecOptions
  ): Promise<{
    response: ExecutionResultWithArrayShapedRows<RowShape> | null;
    error: QueryError | null;
  }>;

  async execute<RowShape extends UnknownObjectShape>(
    query: string,
    executeOptions?: { rowMode: "object" } & BaseExecOptions
  ): Promise<{
    response: ExecutionResultWithObjectShapedRows<RowShape> | null;
    error: QueryError | null;
  }>;

  async execute(
    query: string,
    execOptions?: { rowMode?: "object" | "array" } & BaseExecOptions
  ) {
    // TODO: parameterize this into a function too (maybe just the whole execute method)
    const fetchOptions = this.makeFetchOptions({
      query,
    });

    const queryURL = await this.makeQueryURL({ query });

    // HACKY: needs strategy implementation
    if (this.bodyMode === "json") {
      // HACKY: atm, splitgraph API does not accept "object" as valid param
      // so remove it from execOptions (hacky because ideal is `...execOptions`)
      const httpExecOptions =
        execOptions?.rowMode === "object"
          ? (({ rowMode, ...rest }) => rest)(execOptions)
          : execOptions;

      fetchOptions.body = JSON.stringify({ sql: query, ...httpExecOptions });
    }

    const { response, error } = await fetch(queryURL, fetchOptions)
      .then(async (r) => {
        // TODO: instead of parameterizing mode, parameterize the parser function
        if (this.bodyMode === "jsonl") {
          return (await r.text())
            .split("\n")
            .map((rr) => {
              try {
                return JSON.parse(rr);
              } catch (err) {
                console.warn(
                  `Failed to parse row. Row:\n${rr}Error:\n${err}\n`
                );
                return null;
              }
            })
            .filter((rr) => rr !== null);
        } else if (this.bodyMode === "json") {
          return await r.json();
        } else {
          throw "Unexpected bodyMode (should never happen, default is json)";
        }
      })
      .then((rJson) =>
        execOptions?.rowMode === "array"
          ? {
              response: rJson as WebBridgeResponse<UnknownArrayShape>,
              error: null,
            }
          : {
              response: rJson as WebBridgeResponse<UnknownObjectShape>,
              error: null,
            }
      )
      .catch((err) => ({
        response: null,
        error: { success: false, error: err, trace: err.stack } as QueryError,
      }));

    return {
      response,
      error,
    };
  }
}

// TODO: maybe move/copy to db-{splitgraph,seafowl,etc} - expect them to have it?
// pass in their own factory function here?
export const makeClient = (args: ClientOptions<Strategies>) => {
  const client = new SqlHTTPClient(args);
  return client;
};
