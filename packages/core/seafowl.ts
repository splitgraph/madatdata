import type { DataContext } from "./data-context";
import { makeClient } from "@madatdata/client-http";
import { makeDb, makeDefaultPluginList } from "@madatdata/db-seafowl";
// TODO: these are splitgraph specific defaults
import { defaultDatabase, defaultHost } from "@madatdata/base-client";
export { makeClient as makeSeafowlClient };
export { makeDb as makeSeafowlDb };

// note: "default" is redundant given base-client, but it's a TODO to extract it
export { defaultDatabase as defaultSeafowlDatabase };
export { defaultHost as defaultSeafowlHost };

export type SeafowlDataContext = ReturnType<
  typeof makeSeafowlHTTPContextWithOpts
>;

type SeafowlDbOpts = {
  dbname: string;
};

/**
 * Either provide a string and dbOpts, or a SeafowlDataContextOpts object.
 *
 * If the first argument is a string, then it's assumed to be the instance
 * URL, which is the full URL up to but not including the /q, for example
 * it would be `https://demo.seafowl.cloud`. Also, in this case, the second
 * argument is optionally a dbOpts object which can contain a dbname if it's
 * not default.
 *
 * NOTE: This function signature is a hack before we simplify the config API
 */
export function makeSeafowlHTTPContext(
  optsOrInstanceURL: string | SeafowlDataContextOpts,
  dbOpts?: SeafowlDbOpts
): SeafowlDataContext {
  if (typeof optsOrInstanceURL !== "string") {
    return makeSeafowlHTTPContextWithOpts(optsOrInstanceURL);
  }

  const instanceURL = optsOrInstanceURL;
  return makeSeafowlHTTPContextWithOpts({
    database: {
      dbname: dbOpts?.dbname ?? "default",
    },
    host: {
      dataHost: new URL(instanceURL).host,
      apexDomain: "bogus",
      apiHost: "bogus",
      baseUrls: {
        gql: "bogus",
        sql: instanceURL,
        auth: "bogus",
      },
      postgres: {
        host: "127.0.0.1",
        port: 6432,
        ssl: false,
      },
    },
  });
}

export type SeafowlDataContextOpts = {
  client?: Parameters<typeof makeClient>[0];
  db?: Parameters<typeof makeDb>[0];
} & Omit<
  Partial<
    Omit<
      Parameters<typeof makeClient>[0] & Parameters<typeof makeDb>[0],
      "client" | "db"
    >
  >,
  "strategies"
> &
  Partial<{
    strategies: Parameters<typeof makeClient>[0]["strategies"];
  }>;

const makeSeafowlHTTPContextWithOpts = (opts: SeafowlDataContextOpts) => {
  const dbOpts = {
    authenticatedCredential:
      opts?.db?.authenticatedCredential ??
      opts?.authenticatedCredential ??
      (opts?.credential?.hasOwnProperty("anonymous")
        ? (opts.credential as Parameters<
            typeof makeDb
          >[0]["authenticatedCredential"])
        : undefined),
    database: opts?.db?.database ?? opts?.database ?? defaultDatabase,
    host: opts?.db?.host ?? opts?.host ?? defaultHost,
    plugins: opts?.db?.plugins ?? opts?.plugins ?? makeDefaultPluginList({}),

    ...(opts?.client?.strategies ? { strategies: opts.client.strategies } : {}),
    ...(opts?.strategies ? { strategies: opts.strategies } : {}),
  };

  // TODO: Figure out where dbOpts and clientOpts should/shouldn't overlap
  const clientOpts = {
    credential:
      opts?.client?.credential ??
      opts?.authenticatedCredential ??
      opts?.credential ??
      null,
    database: opts?.client?.database ?? opts?.database ?? defaultDatabase,
    host: opts?.client?.host ?? opts?.host ?? defaultHost,

    // TODO: Copy this to makeSplitgraphHTTPContext

    // NOTE: this is useless because it only gets injected by db
    ...(opts?.client?.strategies ? { strategies: opts.client.strategies } : {}),
    ...(opts?.strategies ? { strategies: opts.strategies } : {}),
  };

  const db = makeDb(dbOpts);

  const client = db.makeHTTPClient(makeClient, clientOpts);

  const seafowlHTTPContext = {
    client,
    db,
  } as DataContext<typeof db>;

  return seafowlHTTPContext;
};
