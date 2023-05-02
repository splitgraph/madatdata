import {
  type CredentialOptions,
  type CredentialFromOptions,
  Credential,
} from "./credential";
import { type Host, defaultHost } from "./host";
import { type Database, defaultDatabase } from "./database";
export { type Host, defaultHost, type Database, defaultDatabase };

export { type CredentialOptions, Credential };

export * from "./host";

export {
  type AuthenticatedCredential,
  type UnknownCredential,
  makeAuthHeaders,
  makeAuthPgParams,
} from "./credential";

export type StrategyOptions = {
  [strategyName: string]: (args: any) => any;
};

export interface ClientOptions<InputStrategyOptions = any> {
  credential?: CredentialOptions | null;
  host?: Host | null;
  database?: Database | null;
  strategies?: InputStrategyOptions;
}

export interface QueryError {
  success: false;
}

export type UnknownObjectShape = { readonly [column: string]: unknown };
export type UnknownArrayShape = ReadonlyArray<unknown>;
export type AnyArrayShape = ReadonlyArray<any>;

export type UnknownRowShape = UnknownObjectShape | UnknownArrayShape;

export interface ExecutionResultBase {
  success: boolean;

  /**
   * HACK: Nothing enforces that this exists, it's up to to each DB to implement
   * the field, and that DB is free to add more fields. I just want to avoid another
   * layer of generic typechecking right now.
   */
  fields: {
    /** The name of the column */
    name: string;
    /** The column index in the returned data */
    columnID: number | string;
    /** The machine readable format of the column*/
    format: string;
    /** The type that should be displayed for human consumption */
    formattedType: string;

    // TODO: implemented by Splitgraph, but not by Seafowl (need to add some generic messiness)
    // dataTypeID: number;
    // dataTypeModifier: number;
    // dataTypeSize: number;
    // tableID: number;
  }[];
}

export interface ExecutionResultWithObjectShapedRows<
  ObjectRowShape extends UnknownObjectShape
> extends ExecutionResultBase {
  rows: ObjectRowShape[];
  readable: () => ReadableStream<ObjectRowShape>;
}

export interface ExecutionResultWithArrayShapedRows<
  ArrayRowShape extends UnknownArrayShape
> extends ExecutionResultBase {
  rows: ArrayRowShape[];
  readable: () => ReadableStream<ArrayRowShape>;
}

export type ExecutionResultFromRowShape<RowShape extends UnknownRowShape> =
  RowShape extends UnknownArrayShape
    ? ExecutionResultWithArrayShapedRows<RowShape>
    : RowShape extends UnknownObjectShape
    ? ExecutionResultWithObjectShapedRows<RowShape>
    : never;

export interface CommonExecuteParameters {
  abortSignal: AbortSignal;
}

export type CommonExecuteOptions = Partial<CommonExecuteParameters>;

export type ClientExecuteOptions = {
  rowMode: "array" | "object" | undefined;
} & CommonExecuteOptions;

export interface Client {
  execute<RowShape extends UnknownArrayShape>(
    query: string,
    executeOptions: { rowMode: "array" } & CommonExecuteOptions
  ): Promise<{
    response: ExecutionResultWithArrayShapedRows<RowShape> | null;
    error: QueryError | null;
  }>;

  execute<RowShape extends UnknownObjectShape>(
    query: string,
    executeOptions?: { rowMode: "object" } & CommonExecuteOptions
  ): Promise<{
    response: ExecutionResultWithObjectShapedRows<RowShape> | null;
    error: QueryError | null;
  }>;

  execute<RowShape extends UnknownRowShape>(
    query: string,
    executeOptions: { rowMode?: "object" | "array" } & CommonExecuteOptions
  ): Promise<{
    response: ExecutionResultFromRowShape<RowShape> | null;
    error: QueryError | null;
  }>;
}

// type StrategyMapFromOptions<Options extends StrategyOptions> = StrategyOptions

// export type CredentialFromOptions<Opt extends BaseCredentialOptions> =
//   Opt extends KeypairCredentialOptions
//     ? KeypairCredential
//     : Opt extends AnonymousTokenCredentialOptions
//     ? AnonymousTokenCredential
//     : Opt extends AuthenticatedTokenCredentialOptions
//     ? AuthenticatedTokenCredential
//     : AnonymousTokenCredential;

export abstract class BaseClient<
  InputCredentialOptions extends CredentialOptions,
  InputStrategyOptions extends StrategyOptions = {}
> implements Client
{
  protected credential: CredentialFromOptions<InputCredentialOptions>;
  protected host: Host;
  protected database: Database;
  protected strategies: InputStrategyOptions;

  constructor(opts: ClientOptions<InputStrategyOptions>) {
    this.credential = Credential(opts.credential || null);

    this.host = opts.host ?? defaultHost;
    this.database = opts.database ?? defaultDatabase;

    this.strategies = (opts.strategies ?? {}) as InputStrategyOptions;
  }

  setCredential(newCredential: InputCredentialOptions | null) {
    this.credential = Credential(newCredential || null);
  }

  // TODO: how many overloads can we move from implementation to here?
  abstract execute<RowShape extends UnknownRowShape>(
    query: string,
    executeOptions?: any & { rowMode?: "object" | "array" }
  ): Promise<{
    response: ExecutionResultFromRowShape<RowShape> | null;
    error: QueryError | null;
  }>;
}
