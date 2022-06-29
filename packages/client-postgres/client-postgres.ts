import {
  BaseClient,
  makeAuthPgParams,
  type QueryError,
  type QueryResult,
  type ClientOptions,
  type CredentialOptions,
  type BaseExecOptions,
  type ValidRowShape,
} from "@madatdata/base-client";

import postgres from "postgres";

interface ExecutePostgresOptions extends BaseExecOptions {
  someOnlyPostgresOption?: "other";
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

  async execute<
    RowShape extends ValidRowShape
    // QueryRowShape = QueryResult<RowShape>
    // ArrayRowShape extends RowShape extends Array<unknown>
    //   ? RowShape
    //   : never,
    // ObjectRowShape extends RowShape extends Record<PropertyKey, unknown>
    //   ? RowShape
    //   : never
  >(query: string, executeOptions?: ExecutePostgresOptions) {
    try {
      // Make a fake tagged template literal (TemplateStringsArray) for postgres
      // (could use .unsafe(), but it doesn't support .values() as documented)
      const wrappedQuery = Object.assign([query], {
        raw: [query],
      }) as TemplateStringsArray;

      // NOTE: must call .values() _now_, not after instantiation, or else it
      // will not add the necessary context during interpolation for later reads
      const rows =
        executeOptions?.rowMode === "array"
          ? await this.connection<RowShape[]>(wrappedQuery).values()
          : await this.connection<RowShape[]>(wrappedQuery);

      return {
        response: {
          success: true,
          rows: executeOptions?.rowMode === "array" ? rows : rows,
        } as QueryResult<RowShape>,
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
