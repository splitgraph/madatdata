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
class SplitgraphHTTPClient<InputCredentialOptions extends CredentialOptions> {
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

  get fetchOptions() {
    return {
      method: "POST",
      headers: {
        // ...makeAuthHeaders(this.credential),
        "Content-type": "application/json",
      },
    };
  }

  async execute(query: string) {
    const fetchOptions = {
      ...this.fetchOptions,
      body: JSON.stringify({ sql: query }),
    };

    const response = await fetch(this.queryUrl, fetchOptions)
      .then((r) => r.json())
      .catch((err) => ({ success: false, error: err, trace: err.stack }));

    return {
      response,
    };
  }
}

export const makeClient = (args: ClientOptions) => {
  const client = new SplitgraphHTTPClient(args);
  return client;
};
