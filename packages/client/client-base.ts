import type { CredentialOptions } from "./credential";
import type { Host } from "./host";
import type { Database } from "./database";

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
