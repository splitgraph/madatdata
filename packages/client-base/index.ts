import {
  type CredentialOptions,
  type CredentialFromOptions,
  Credential,
} from "./credential";
import { type Host, defaultHost } from "./host";
import { type Database, defaultDatabase } from "./database";

export { type CredentialOptions };

// TODO: this is HTTP specific, just exporting here as a shim during refactor so
// that derived classes don't need to add includes for `base-client/credential`
export { makeAuthHeaders } from "./credential";
export interface ClientOptions {
  credential?: CredentialOptions | null;
  host?: Host | null;
  database?: Database | null;
}

export interface Response<ResultShape extends Record<PropertyKey, unknown>> {
  rows: ResultShape[];
  success: boolean;
}

export interface WebBridgeResponse<
  ResultShape extends Record<PropertyKey, unknown>
> extends Response<ResultShape> {
  command: string;
  fields: {
    columnID: number;
    dataTypeID: number;
    dataTypeModifier: number;
    dataTypeSize: number;
    format: string;
    formattedType: string;
    name: string;
    tableID: number;
  }[];
  rowCount: 1;
  rows: ResultShape[];
  success: true;
  /** FIXME: optional to allow deleting it for inline snapshots */
  executionTime?: string;
  /** FIXME: optional to allow deleting it for inline snapshots */
  executionTimeHighRes?: string;
}

export type QueryResult<
  ResultShape extends Record<PropertyKey, unknown> = Record<
    PropertyKey,
    unknown
  >,
  ExpectedResult extends Response<ResultShape> = WebBridgeResponse<ResultShape>
> = {
  [k in keyof ExpectedResult]: ExpectedResult[k];
} & { success: true };

export interface QueryError {
  success: false;
}

export interface Client {
  execute: <ResultShape extends Record<PropertyKey, unknown>>(
    query: string
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
    query: string
  ): Promise<{
    response: QueryResult<ResultShape> | null;
    error: QueryError | null;
  }>;
}
