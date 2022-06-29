import {
  BaseClient,
  makeAuthPgParams,
  type QueryError,
  type QueryResult,
  type ClientOptions,
  type CredentialOptions,
} from "@madatdata/base-client";

import postgres from "postgres";

interface ExecutePostgresOptions {
  /** TODO: Feature works, but TypeScript will not enforce array ResultShape */
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
      // Make a fake template template string array to pass to Postgres
      // we could use .unsafe(), but this doesn't support .values()
      const wrappedQuery = Object.assign([query], {
        raw: [query],
      }) as TemplateStringsArray;

      // NOTE: must call .values() _now_, not after instantiation, or else it
      // will not add the necessary context during interpolation for later reads
      const rows =
        executeOptions?.rowMode === "array"
          ? await this.connection<ResultShape[]>(wrappedQuery).values()
          : await this.connection<ResultShape[]>(wrappedQuery);

      return {
        response: {
          success: true,
          rows,
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

// TEMPORARY: add .values() to typings by copying unreleased bugfix from commit:
// https://github.com/porsager/postgres/commit/ac1bca41004c7923b877c26f2ffc3039b70b4432
declare module "postgres" {
  type ValuesRowList<T extends readonly any[]> =
    T[number][keyof T[number]][][] &
      postgres.ResultQueryMeta<T["length"], keyof T[number]>;

  interface PendingValuesQuery<TRow extends readonly postgres.MaybeRow[]>
    extends Promise<ValuesRowList<TRow>>,
      postgres.PendingQueryModifiers<TRow[number][keyof TRow[number]][][]> {
    describe(): postgres.PendingDescribeQuery;
  }

  interface PendingQuery<TRow extends readonly postgres.MaybeRow[]>
    extends Promise<postgres.RowList<TRow>>,
      postgres.PendingQueryModifiers<TRow> {
    describe(): postgres.PendingDescribeQuery;
    values(): PendingValuesQuery<TRow>;
    raw(): postgres.PendingRawQuery<TRow>;
  }
}
