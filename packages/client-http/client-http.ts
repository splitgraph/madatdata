import {
  BaseClient,
  makeAuthHeaders,
  type QueryError,
  type QueryResult,
  type ClientOptions,
  type CredentialOptions,
  type Response,
  type ValidRowShape,
} from "@madatdata/base-client";

export interface WebBridgeResponse<RowShape extends ValidRowShape>
  extends Response<RowShape> {
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

interface ExecuteOptions {
  /** TODO:
   * This mode is supported, but it's not reflected in the RowShape type yet.
   */
  rowMode?: "array";
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

  async execute<RowShape extends ValidRowShape>(
    query: string,
    execOptions?: ExecuteOptions
  ) {
    const fetchOptions = {
      ...this.fetchOptions,
      body: JSON.stringify({ sql: query, ...execOptions }),
    };

    const { response, error } = await fetch(this.queryUrl, fetchOptions)
      .then((r) => r.json())
      .then((rJson) => ({
        response: rJson as QueryResult<RowShape, WebBridgeResponse<RowShape>>,
        error: null,
      }))
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
