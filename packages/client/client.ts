import {
  type CredentialOptions,
  type CredentialFromOptions,
  Credential,
  makeAuthHeaders,
} from "./credential";

import { type Host, defaultHost } from "./host";

import { type Database, defaultDatabase } from "./database";

import type {
  Client,
  QueryError,
  QueryResult,
  ClientOptions,
} from "./client-base";

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

  setCredential(newCredential: InputCredentialOptions | null) {
    this.credential = Credential(newCredential || null);
  }

  private get fetchOptions() {
    return {
      method: "POST",
      headers: {
        ...makeAuthHeaders(this.credential),
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
