import {
  BaseClient,
  makeAuthPgParams,
  type QueryError,
  type QueryResult,
  type ClientOptions,
  type CredentialOptions,
} from "@madatdata/base-client";

import postgres from "postgres";

// TODO: Same shape in client-http, should probably be moved to base-client
interface ExecutePostgresOptions {
  /** WARNING: Not yet implemented, will still return Object type */
  rowMode?: "array";
}

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
    query: string,
    executeOptions?: ExecutePostgresOptions
  ) {
    try {
      // TODO: Figure out how to get rowMode to work with .unsafe(), since
      // calling .values() doesn't seem to work like it would with interpolation
      const rows = await this.connection<ResultShape[]>.unsafe(query);

      return {
        response: {
          success: true,
          rows:
            executeOptions?.rowMode === "array"
              ? Array.from(rows.values())
              : rows,
        } as QueryResult<ResultShape>,
        error: null,
      };
    } catch (err: any) {
      return {
        response: null,
        error: { success: false, error: err, trace: err?.stack } as QueryError,
      };
    }
  }
}

export const makeClient = (args: ClientOptions) => {
  const client = new SplitgraphPostgresClient(args);
  return client;
};
