import { makeSeafowlHTTPContext } from "../seafowl";

// @ts-expect-error https://stackoverflow.com/a/70711231
export const SEAFOWL_SECRET = import.meta.env.VITE_TEST_SEAFOWL_SECRET;

export const createDataContext = (
  opts?: Parameters<typeof makeSeafowlHTTPContext>[0] & { secret?: string }
) => {
  return makeSeafowlHTTPContext({
    database: {
      dbname: "default",
    },
    authenticatedCredential: opts?.secret
      ? {
          token: opts?.secret,
          anonymous: false,
        }
      : undefined,
    host: {
      // temporary hacky mess
      dataHost: "127.0.0.1:8080",
      apexDomain: "bogus",
      apiHost: "bogus",
      baseUrls: {
        gql: "bogus",
        sql: "http://127.0.0.1:8080",
        auth: "bogus",
      },
      postgres: {
        host: "127.0.0.1",
        port: 6432,
        ssl: false,
      },
    },
    ...opts, // note: only top level keys are merged
  });
};

export const createRealDataContext = () => {
  return makeSeafowlHTTPContext({
    database: {
      dbname: "default",
    },
    authenticatedCredential: {
      token: SEAFOWL_SECRET,
      anonymous: false,
    },
    host: {
      // temporary hacky mess
      dataHost: "127.0.0.1:8080",
      apexDomain: "bogus",
      apiHost: "bogus",
      baseUrls: {
        gql: "bogus",
        sql: "http://127.0.0.1:8080",
        auth: "bogus",
      },
      postgres: {
        host: "127.0.0.1",
        port: 6432,
        ssl: false,
      },
    },
  });
};
