import {
  type CredentialOptions,
  type CredentialFromOptions,
  isAuthenticatedTokenCredential,
  Credential,
  makeAuthHeaders,
  isKeypairCredential,
  isTokenCredential,
  isAnonymousTokenCredential,
} from "./credential";

import { type Host, defaultHost } from "./host";

import { type Database, defaultDatabase } from "./database";

interface ClientOptions {
  credential: CredentialOptions | null;
  host: Host | null;
  database: Database | null;
}

class SplitgraphHTTPClient<InputCredentialOptions extends CredentialOptions> {
  private credential: CredentialFromOptions<InputCredentialOptions>;
  private host: Host;
  private database: Database;

  constructor(opts: ClientOptions) {
    this.credential = Credential(opts.credential);

    this.host = opts.host ?? defaultHost;
    this.database = opts.database ?? defaultDatabase;
  }

  async execute(query: string) {
    const fetchOptions = {
      method: "POST",
      headers: {
        ...makeAuthHeaders(this.credential),
        "Content-type": "application/json",
      },
      body: JSON.stringify({ sql: query }),
    };

    if (isTokenCredential(this.credential)) {
      // this.credential.
    } else if (isKeypairCredential(this.credential)) {
      // this.credential.
    }

    const response = await fetch(this.host.baseUrls.sql, fetchOptions)
      .then((r) => r.json())
      .catch((err) => ({ success: false, error: err, trace: err.stack }));

    return {
      response,
    };
  }
}

export const makeClient = (args: ClientOptions) => {
  // const client = new SplitgraphHTTPClient(args);
  // return client;
};
