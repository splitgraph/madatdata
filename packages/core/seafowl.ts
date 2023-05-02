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

export type SeafowlDataContext = ReturnType<typeof makeSeafowlHTTPContext>;

export const makeSeafowlHTTPContext = (
  opts?: {
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
    }>
) => {
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
