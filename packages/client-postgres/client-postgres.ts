import {
  BaseClient,
  makeAuthPgParams,
  type QueryError,
  type ClientOptions,
  type CredentialOptions,
  // type UnknownRowShape,
  type UnknownObjectShape,
  type ExecutionResultWithArrayShapedRows,
  type ExecutionResultWithObjectShapedRows,
  type UnknownArrayShape,
} from "@madatdata/base-client";

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

  async execute(
    query: string,
    executeOptions?: { rowMode?: "object" | "array" }
  ) {
    // Make a fake tagged template literal (TemplateStringsArray) for postgres
    // (could use .unsafe(), but it doesn't support .values() as documented)
    const wrappedQuery = Object.assign([query], {
      raw: [query],
    }) as TemplateStringsArray;

    try {
      if (executeOptions && executeOptions.rowMode === "array") {
        let arrayShapedRows = Array.from(
          await this.connection(wrappedQuery).values()
        );

        return {
          response: {
            success: true,
            rows: arrayShapedRows,
            readable: () => new ReadableStream<UnknownArrayShape>(),
          },
          error: null,
        };
      } else {
        let objectShapedRows = Array.from(await this.connection(wrappedQuery));

        return {
          response: {
            success: true,
            rows: objectShapedRows,
            readable: () => new ReadableStream<UnknownObjectShape>(),
          },
          error: null,
        };
      }
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
