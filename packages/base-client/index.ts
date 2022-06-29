import {
  type CredentialOptions,
  type CredentialFromOptions,
  Credential,
} from "./credential";
import { type Host, defaultHost } from "./host";
import { type Database, defaultDatabase } from "./database";
export { type Host, defaultHost, type Database, defaultDatabase };

export { type CredentialOptions, Credential };

export {
  type AuthenticatedCredential,
  makeAuthHeaders,
  makeAuthPgParams,
} from "./credential";
export interface ClientOptions {
  credential?: CredentialOptions | null;
  host?: Host | null;
  database?: Database | null;
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
}

export interface ExecutionResultWithObjectShapedRows<
  ObjectRowShape extends UnknownObjectShape
> extends ExecutionResultBase {
  rows: ObjectRowShape[];
}

export interface ExecutionResultWithArrayShapedRows<
  ArrayRowShape extends UnknownArrayShape
> extends ExecutionResultBase {
  rows: ArrayRowShape[];
}

export type ExecutionResultFromRowShape<RowShape extends UnknownRowShape> =
  RowShape extends UnknownArrayShape
    ? ExecutionResultWithArrayShapedRows<RowShape>
    : RowShape extends UnknownObjectShape
    ? ExecutionResultWithObjectShapedRows<RowShape>
    : never;

export interface Client {
  execute<RowShape extends UnknownObjectShape>(
    query: string
  ): Promise<{
    response: ExecutionResultWithObjectShapedRows<RowShape> | null;
    error: QueryError | null;
  }>;

  execute<RowShape extends UnknownArrayShape>(
    query: string,
    executeOptions: { rowMode: "array" }
  ): Promise<{
    response: ExecutionResultWithArrayShapedRows<RowShape> | null;
    error: QueryError | null;
  }>;

  execute<RowShape extends UnknownObjectShape>(
    query: string,
    executeOptions: { rowMode: "object" }
  ): Promise<{
    response: ExecutionResultWithObjectShapedRows<RowShape> | null;
    error: QueryError | null;
  }>;

  execute<RowShape extends UnknownRowShape>(
    query: string,
    executeOptions: { rowMode?: "object" | "array" }
  ): Promise<{
    response: ExecutionResultFromRowShape<RowShape> | null;
    error: QueryError | null;
  }>;
}

export abstract class BaseClient<
  InputCredentialOptions extends CredentialOptions
> implements Client
{
  protected credential: CredentialFromOptions<InputCredentialOptions>;
  protected host: Host;
  protected database: Database;

  constructor(opts: ClientOptions) {
    this.credential = Credential(opts.credential || null);

    this.host = opts.host ?? defaultHost;
    this.database = opts.database ?? defaultDatabase;
  }

  setCredential(newCredential: InputCredentialOptions | null) {
    this.credential = Credential(newCredential || null);
  }

  // TODO: how many overloads can we move from implementation to here?
  // abstract execute<RowShape extends UnknownObjectShape>(
  //   query: string
  // ): Promise<{
  //   response: ExecutionResultWithObjectShapedRows<RowShape> | null;
  //   error: QueryError | null;
  // }>;

  abstract execute<RowShape extends UnknownRowShape>(
    query: string,
    executeOptions?: any & { rowMode?: "object" | "array" }
  ): Promise<{
    response: ExecutionResultFromRowShape<RowShape> | null;
    error: QueryError | null;
  }>;
}
