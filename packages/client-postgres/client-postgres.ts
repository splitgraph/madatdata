import {
  BaseClient,
  makeAuthPgParams,
  type QueryError,
  type QueryResult,
  type ClientOptions,
  type CredentialOptions,
} from "@madatdata/client-base";

import postgres from "postgres";

class SplitgraphPostgresClient<
  InputCredentialOptions extends CredentialOptions
> extends BaseClient<InputCredentialOptions> {
  public connection: ReturnType<typeof postgres>;

  constructor(opts: ClientOptions) {
    super(opts);

    this.connection = postgres(this.connectionOptions);
  }

  private get connectionOptions() {
    const { username, password } = makeAuthPgParams(this.credential);

    return {
      host: this.host.postgres.host,
      port: this.host.postgres.port,
      ssl: this.host.postgres.ssl,
      database: this.database.dbname,
      username: username,
      password: password,
    };
  }

  async execute<ResultShape extends Record<PropertyKey, unknown>>(
    query: string
  ) {
    try {
      const rows = await this.connection<ResultShape[]>.unsafe(query);

      return {
        response: {
          success: true,
          rows
        } as QueryResult<ResultShape>,
        error: null
      }
    } catch (err: any) {
      return {
        response: null,
        error: { success: false, error: err, trace: err?.stack } as QueryError
      }
    }
  }
}

export const makeClient = (args: ClientOptions) => {
  const client = new SplitgraphPostgresClient(args);
  return client;
};
