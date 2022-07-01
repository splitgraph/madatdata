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

class SplitgraphHTTPClient<
  InputCredentialOptions extends CredentialOptions
> extends BaseClient<InputCredentialOptions> {
  private queryUrl: string;

  constructor(opts: ClientOptions) {
    super(opts);
    this.queryUrl = this.host.baseUrls.sql + "/" + this.database.dbname;
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
    executeOptions: { rowMode: "array" }
  ): Promise<{
    response: ExecutionResultWithArrayShapedRows<RowShape> | null;
    error: QueryError | null;
  }>;

  async execute<RowShape extends UnknownObjectShape>(
    query: string,
    executeOptions?: { rowMode: "object" }
  ): Promise<{
    response: ExecutionResultWithObjectShapedRows<RowShape> | null;
    error: QueryError | null;
  }>;

  async execute(query: string, execOptions?: { rowMode?: "object" | "array" }) {
    const fetchOptions = {
      ...this.fetchOptions,
      body: JSON.stringify({ sql: query, ...execOptions }),
    };

    const { response, error } = await fetch(this.queryUrl, fetchOptions)
      .then((r) => r.json())
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

export const makeClient = (args: ClientOptions) => {
  const client = new SplitgraphHTTPClient(args);
  return client;
};
