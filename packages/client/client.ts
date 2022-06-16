import {
  BaseClient,
  makeAuthHeaders,
  type QueryError,
  type QueryResult,
  type ClientOptions,
  type CredentialOptions,
} from "@madatdata/client-base";

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

  async execute<ResultShape extends Record<PropertyKey, unknown>>(
    query: string
  ) {
    const fetchOptions = {
      ...this.fetchOptions,
      body: JSON.stringify({ sql: query }),
    };

    const { response, error } = await fetch(this.queryUrl, fetchOptions)
      .then((r) => r.json())
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
  const client = new SplitgraphHTTPClient(args);
  return client;
};
