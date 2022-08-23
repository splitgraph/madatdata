import {
  BaseClient,
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

type MakeFetchOptionsStrategyArgs = {
  credential: UnknownCredential;
  query: string;
  execOptions: ExecOptions;
};

type MakeFetchOptionsStrategy = ({
  credential,
  query,
  execOptions,
}: MakeFetchOptionsStrategyArgs) => RequestInit;

type MakeQueryURLStrategyArgs = {
  database: Database;
  host: Host;
  query?: string;
};

type MakeQueryURLStrategy = ({
  database,
  host,
}: MakeQueryURLStrategyArgs) => Promise<string>;

export type HTTPStrategies = {
  makeFetchOptions: MakeFetchOptionsStrategy;
  makeQueryURL: MakeQueryURLStrategy;
};

export type HTTPClientOptions = {
  bodyMode?: BodyMode;
  strategies?: HTTPStrategies;
};

type BaseExecOptions = {
  bodyMode?: BodyMode;
};

type ExecOptions = BaseExecOptions & {
  rowMode?: "object" | "array" | undefined;
};

export interface HTTPClientQueryError extends QueryError {
  response?: Response;
}

export class SqlHTTPClient<
  InputCredentialOptions extends CredentialOptions
> extends BaseClient<InputCredentialOptions, HTTPStrategies> {
  private bodyMode: BodyMode;

  constructor(opts: ClientOptions<HTTPStrategies> & HTTPClientOptions) {
    super(opts);

    this.bodyMode = opts.bodyMode ?? "json";

    if (!opts.strategies) {
      throw "strategies parameter is required for SqlHTTPClient";
    }

    this.strategies = {
      makeFetchOptions: opts.strategies?.makeFetchOptions,
      makeQueryURL: opts.strategies?.makeQueryURL,
    };
  }

  private async makeQueryURL({ query }: Partial<MakeQueryURLStrategyArgs>) {
    return await this.strategies.makeQueryURL({
      query,
      host: this.host,
      database: this.database,
    });
  }

  private makeFetchOptions({
    query,
    execOptions,
  }: Pick<MakeFetchOptionsStrategyArgs, "query" | "execOptions">) {
    return this.strategies.makeFetchOptions({
      credential: this.credential,
      query,
      execOptions,
    });
  }

  static defaultExecOptions(
    inputExecOptions?: Partial<ExecOptions>
  ): ExecOptions {
    return {
      rowMode: "object",
      ...(inputExecOptions ?? {}),
    };
  }

  async execute<RowShape extends UnknownArrayShape>(
    query: string,
    executeOptions: { rowMode: "array" } & BaseExecOptions
  ): Promise<{
    response: ExecutionResultWithArrayShapedRows<RowShape> | null;
    error: HTTPClientQueryError | null;
  }>;

  async execute<RowShape extends UnknownObjectShape>(
    query: string,
    executeOptions?: { rowMode: "object" } & BaseExecOptions
  ): Promise<{
    response: ExecutionResultWithObjectShapedRows<RowShape> | null;
    error: HTTPClientQueryError | null;
  }>;

  async execute(
    query: string,
    execOptions?: { rowMode?: "object" | "array" } & BaseExecOptions
  ) {
    const queryURL = await this.makeQueryURL({ query });
    const fetchOptions = this.makeFetchOptions({
      query,
      execOptions: SqlHTTPClient.defaultExecOptions(execOptions),
    });

    const { response, error } = await fetch(queryURL, fetchOptions)
      .catch((err) => Promise.reject({ type: "network", ...err }))
      .then(async (r) => {
        if (r.type === "error") {
          // note: very rare (usually fetch itself rejects promise)
          // see: https://developer.mozilla.org/en-US/docs/Web/API/Response/type
          return Promise.reject({ type: "network", response: r });
        }

        if (!r.ok) {
          return Promise.reject({ type: "response-not-ok", response: r });
        }

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
        error: {
          success: false,
          ...err,
        } as HTTPClientQueryError,
      }));

    return {
      response,
      error,
    };
  }
}

// TODO: maybe move/copy to db-{splitgraph,seafowl,etc} - expect them to have it?
// pass in their own factory function here?
export const makeClient = (args: ClientOptions<HTTPStrategies>) => {
  const client = new SqlHTTPClient(args);
  return client;
};
