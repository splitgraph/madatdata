import {
  BaseClient,
  type QueryError,
  type QueryResult,
  type ClientOptions,
  type CredentialOptions,
} from "@madatdata/client-base";

class SplitgraphPostgresClient<
  InputCredentialOptions extends CredentialOptions
> extends BaseClient<InputCredentialOptions> {
  private pgConn: string;

  constructor(opts: ClientOptions) {
    super(opts);

    this.pgConn = "testing 1 2 3";
  }

  private get execOptions() {
    return {
      pgConn: this.pgConn,
    };
  }

  async execute<ResultShape extends Record<PropertyKey, unknown>>(
    query: string
  ) {
    const execOptions = {
      ...this.execOptions,
      body: JSON.stringify({ sql: query }),
    };

    console.log("execOptions:", execOptions);

    const { response, error } = await Promise.resolve({
      command: "SELECT",
      fields: [],
      rowCount: 0,
      rows: [],
      success: true,
      executionTime: "0",
      executionTimeHighRes: "0.00000",
    })
      .then((rJson) => ({
        response: rJson as QueryResult<ResultShape>,
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
  const client = new SplitgraphPostgresClient(args);
  return client;
};
