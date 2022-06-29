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

export interface Response<RowShape extends ValidRowShape> {
  rows: RowShape[] | Iterable<RowShape>;
  success: boolean;
}

export type QueryResult<
  RowShape extends ValidRowShape = Record<PropertyKey, unknown>,
  ExpectedResult extends Response<RowShape> = Response<RowShape>
> = {
  [k in keyof ExpectedResult]: ExpectedResult[k];
} & { success: true };

export interface QueryError {
  success: false;
}

export type ValidRowShape = Record<PropertyKey, unknown> | Array<unknown>;

export interface Client {
  // execute: <RowRowShape extends Array<unknown>>(
  //   query: string,
  //   executeOptions?: any
  // ) => Promise<{
  //   response: QueryResult<RowShape> | null;
  //   error: QueryError | null;
  // }>;
  execute: <RowShape extends ValidRowShape>(
    query: string,
    executeOptions?: any
  ) => Promise<{
    response: QueryResult<RowShape> | null;
    error: QueryError | null;
  }>;
}

export interface BaseExecOptions {
  rowMode?: "array";
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

  abstract execute<
    RowShape extends ValidRowShape
    // ExecuteOptionsShape extends BaseExecOptions = BaseExecOptions
  >(
    query: string,
    executeOptions?: BaseExecOptions
  ): Promise<{
    response: QueryResult<RowShape> | null;
    error: QueryError | null;
  }>;
}
