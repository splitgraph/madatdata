import {
  type CredentialOptions,
  type CredentialFromOptions,
  Credential,
  makeAuthHeaders,
  isKeypairCredential,
  isTokenCredential,
} from "./credential";

import { type Host, defaultHost } from "./host";

import { type Database, defaultDatabase } from "./database";

interface ClientOptions {
  credential?: CredentialOptions | null;
  host?: Host | null;
  database?: Database | null;
}

interface Response<ResultShape extends Record<PropertyKey, unknown>> {
  rows: ResultShape[];
  success: boolean;
}

interface WebBridgeResponse<ResultShape extends Record<PropertyKey, unknown>>
  extends Response<ResultShape> {
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

type QueryResult<
  ResultShape extends Record<PropertyKey, unknown> = Record<
    PropertyKey,
    unknown
  >,
  ExpectedResult extends Response<ResultShape> = WebBridgeResponse<ResultShape>
> = {
  [k in keyof ExpectedResult]: ExpectedResult[k];
} & { success: true };

interface QueryError {
  success: false;
}
interface Client {
  execute: <ResultShape extends Record<PropertyKey, unknown>>(
    query: string
  ) => Promise<{
    response: QueryResult<ResultShape> | null;
    error: QueryError | null;
  }>;
}

class SplitgraphHTTPClient<InputCredentialOptions extends CredentialOptions>
  implements Client
{
  private credential: CredentialFromOptions<InputCredentialOptions>;
  private host: Host;
  private database: Database;
  private queryUrl: string;

  constructor(opts: ClientOptions) {
    this.credential = Credential(opts.credential || null);

    this.host = opts.host ?? defaultHost;
    this.database = opts.database ?? defaultDatabase;
    this.queryUrl = this.host.baseUrls.sql + "/" + this.database.dbname;
  }

  private get fetchOptions() {
    return {
      method: "POST",
      headers: {
        // ...makeAuthHeaders(this.credential),
        "Content-type": "application/json",
      },
    };
  }

  async execute<ResultShape extends Record<PropertyKey, unknown>>(
    query: string
  ) {
    const fetchOptions = {
      ...this.fetchOptions,
      body: JSON.stringify({ sql: query }),
    };

    const { response, error } = await fetch(this.queryUrl, fetchOptions)
      .then((r) => r.json())
      .then((rJson) => ({
        response: rJson as QueryResult<ResultShape>,
        error: null,
      }))
      .catch((err) => ({
        response: null,
        error: { success: false, error: err, trace: err.stack } as QueryError,
      }));

    return {
      response,
      error,
    };
  }
}

export const makeClient = (args: ClientOptions) => {
  const client = new SplitgraphHTTPClient(args);
  return client;
};
