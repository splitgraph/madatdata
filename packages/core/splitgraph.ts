import type { DataContext } from "./data-context";
import { makeClient } from "@madatdata/client-http";
import { makeDb, SplitgraphPluginList } from "@madatdata/db-splitgraph";
import { defaultDatabase, defaultHost } from "@madatdata/base-client";
export { makeClient as makeSplitgraphClient };
export { makeDb as makeSplitgraphDb };

// note: "default" is redundant given base-client, but it's a TODO to extract it
export { defaultDatabase as defaultSplitgraphDatabase };
export { defaultHost as defaultSplitgraphHost };

export type SplitgraphDataContext = ReturnType<
  typeof makeSplitgraphHTTPContext
>;

export const makeSplitgraphHTTPContext = (
  opts?: {
    client?: Parameters<typeof makeClient>[0];
    db?: Parameters<typeof makeDb>[0];
  } & Partial<
    Omit<
      Parameters<typeof makeClient>[0] & Parameters<typeof makeDb>[0],
      "client" | "db"
    >
  >
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
    plugins: opts?.db?.plugins ?? opts?.plugins,
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
  };

  const db = makeDb(dbOpts);

  const client = db.makeHTTPClient(makeClient, clientOpts);

  const splitgraphHTTPContext = {
    client,
    db,
  } as DataContext<typeof db, SplitgraphPluginList>;

  return splitgraphHTTPContext;
};
