import type { DataContext } from "./data-context";
import { makeClient } from "@madatdata/client-http";
import { makeDb, makeDefaultPluginList } from "@madatdata/db-splitgraph";
import { defaultDatabase, defaultHost } from "@madatdata/base-client";
export { makeClient as makeSplitgraphClient };
export { makeDb as makeSplitgraphDb };

// note: "default" is redundant given base-client, but it's a TODO to extract it
export { defaultDatabase as defaultSplitgraphDatabase };
export { defaultHost as defaultSplitgraphHost };

export type SplitgraphDataContext = ReturnType<
  typeof makeSplitgraphHTTPContextWithOpts
>;

export type SplitgraphDataContextOpts = {
  client?: Parameters<typeof makeClient>[0];
  db?: Parameters<typeof makeDb>[0];
} & Partial<
  Omit<
    Parameters<typeof makeClient>[0] & Parameters<typeof makeDb>[0],
    "client" | "db"
  >
>;

/**
 * Call with no options to create a data context that is anonymous and targeting
 * the public Splitgraph DDN at data.splitgraph.com.
 *
 *
 * @param opts Optional options argument. If none are defined, default to anonymous public DDN
 */
export const makeSplitgraphHTTPContext = (opts?: SplitgraphDataContextOpts) => {
  if (typeof opts === "undefined") {
    return makeSplitgraphHTTPContextWithOpts({ credential: null });
  }

  return makeSplitgraphHTTPContextWithOpts(opts);
};

const makeSplitgraphHTTPContextWithOpts = (opts: SplitgraphDataContextOpts) => {
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
    plugins:
      opts?.db?.plugins ??
      opts?.plugins ??
      makeDefaultPluginList({
        graphqlEndpoint: (opts?.db?.host ?? opts?.host ?? defaultHost).baseUrls
          .gql,
        authenticatedCredential: opts?.db?.authenticatedCredential,
      }),

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

    // NOTE: this is useless because it only gets injected by db
    ...(opts?.client?.strategies ? { strategies: opts.client.strategies } : {}),
    ...(opts?.strategies ? { strategies: opts.strategies } : {}),
  };

  const db = makeDb(dbOpts);

  const client = db.makeHTTPClient(makeClient, clientOpts);

  const splitgraphHTTPContext = {
    client,
    db,
  } as DataContext<typeof db>;

  return splitgraphHTTPContext;
};
