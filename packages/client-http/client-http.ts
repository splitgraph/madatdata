import {
  BaseClient,
  makeAuthHeaders,
  type QueryError,
  type ClientOptions,
  type CredentialOptions,
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

type HTTPClientOptions = {
  bodyMode?: BodyMode;
};

type BaseExecOptions = {
  bodyMode?: BodyMode;
};

export class SqlHTTPClient<
  InputCredentialOptions extends CredentialOptions
> extends BaseClient<InputCredentialOptions> {
  private queryUrl: string;
  private bodyMode: BodyMode;

  constructor(opts: ClientOptions & HTTPClientOptions) {
    super(opts);
    this.queryUrl = this.host.baseUrls.sql + "/" + this.database.dbname;

    this.bodyMode = opts.bodyMode ?? "json";
  }

  private get fetchOptions() {
    return {
      method: "POST",
      headers: {
        ...makeAuthHeaders(this.credential),
        "Content-type": "application/json",
      },
    };
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
    // HACKY: atm, splitgraph API does not accept "object" as valid param
    // so remove it from execOptions (hacky because ideal is `...execOptions`)
    const httpExecOptions =
      execOptions?.rowMode === "object"
        ? (({ rowMode, ...rest }) => rest)(execOptions)
        : execOptions;

    // TODO: parameterize this into a function too (maybe just the whole execute method)
    const fetchOptions = {
      ...this.fetchOptions,
      method: "POST",
      body: JSON.stringify({ sql: query, ...httpExecOptions }),
    };

    const { response, error } = await fetch(this.queryUrl, fetchOptions)
      .then(async (r) => {
        // TODO: instead of parameterizing mode, parameterize the parser function
        if (this.bodyMode === "jsonl") {
          return (await r.text()).split("\n").map((rr) => {
            try {
              return JSON.parse(rr);
            } catch (err) {
              console.log("oh no, parsing error, on:");
              console.log(rr);
            }
          });
        } else if (this.bodyMode === "json") {
          return r.json();
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
export const makeClient = (args: ClientOptions) => {
  const client = new SqlHTTPClient(args);
  return client;
};
