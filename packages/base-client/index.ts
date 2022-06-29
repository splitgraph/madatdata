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

export interface Response<ResultShape extends Record<PropertyKey, unknown>> {
  rows: ResultShape[] | Iterable<ResultShape>;
  success: boolean;
}

export type QueryResult<
  ResultShape extends Record<PropertyKey, unknown> = Record<
    PropertyKey,
    unknown
  >,
  ExpectedResult extends Response<ResultShape> = Response<ResultShape>
> = {
  [k in keyof ExpectedResult]: ExpectedResult[k];
} & { success: true };

export interface QueryError {
  success: false;
}

export interface Client {
  execute: <ResultShape extends Record<PropertyKey, unknown>>(
    query: string,
    executeOptions?: any
  ) => Promise<{
    response: QueryResult<ResultShape> | null;
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

  abstract execute<ResultShape extends Record<PropertyKey, unknown>>(
    query: string,
    executeOptions?: any
  ): Promise<{
    response: QueryResult<ResultShape> | null;
    error: QueryError | null;
  }>;
}
