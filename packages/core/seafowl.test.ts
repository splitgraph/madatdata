import { describe, it, expect } from "vitest";

import { makeSeafowlHTTPContext } from "./seafowl";
import { setupMswServerTestHooks } from "@madatdata/test-helpers/msw-server-hooks";
import { shouldSkipSeafowlTests } from "@madatdata/test-helpers/env-config";

// @ts-expect-error https://stackoverflow.com/a/70711231
const SEAFOWL_SECRET = import.meta.env.VITE_TEST_SEAFOWL_SECRET;

const createDataContext = () => {
  return makeSeafowlHTTPContext({
    database: {
      dbname: "seafowl", // arbitrary
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
        sql: "http://127.0.0.1:8080/q",
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

describe("makeSeafowlHTTPContext", () => {
  setupMswServerTestHooks();

  it("initializes as expected", () => {
    const ctx = createDataContext();

    expect(ctx.client).toBeTruthy();
    expect(ctx.db).toBeTruthy();

    // NOTE: seafowlClient is expected to be undefined because we don't set it
    // in the constructor (since it depends on the instantiated class). Instead
    // we set it via a builder like withOptions (in other words, the instance
    // created via `new DbSeafowl()` cannot control a seafowlClient, and must create
    // a new instance from one of its builder methods to use a seafowlClient)
    //    (this is not necessarily a desirable state of affairs)
    expect(ctx).toMatchInlineSnapshot(`
      {
        "client": SqlHTTPClient {
          "bodyMode": "jsonl",
          "credential": {
            "anonymous": false,
            "token": "${SEAFOWL_SECRET}",
          },
          "database": {
            "dbname": "seafowl",
          },
          "host": {
            "apexDomain": "bogus",
            "apiHost": "bogus",
            "baseUrls": {
              "auth": "bogus",
              "gql": "bogus",
              "sql": "http://127.0.0.1:8080/q",
            },
            "dataHost": "127.0.0.1:8080",
            "postgres": {
              "host": "127.0.0.1",
              "port": 6432,
              "ssl": false,
            },
          },
          "strategies": {
            "makeFetchOptions": [Function],
            "makeQueryURL": [Function],
          },
        },
        "db": DbSeafowl {
          "authenticatedCredential": {
            "anonymous": false,
            "token": "${SEAFOWL_SECRET}",
          },
          "database": {
            "dbname": "seafowl",
          },
          "host": {
            "apexDomain": "bogus",
            "apiHost": "bogus",
            "baseUrls": {
              "auth": "bogus",
              "gql": "bogus",
              "sql": "http://127.0.0.1:8080/q",
            },
            "dataHost": "127.0.0.1:8080",
            "postgres": {
              "host": "127.0.0.1",
              "port": 6432,
              "ssl": false,
            },
          },
          "opts": {
            "authenticatedCredential": {
              "anonymous": false,
              "token": "${SEAFOWL_SECRET}",
            },
            "database": {
              "dbname": "seafowl",
            },
            "host": {
              "apexDomain": "bogus",
              "apiHost": "bogus",
              "baseUrls": {
                "auth": "bogus",
                "gql": "bogus",
                "sql": "http://127.0.0.1:8080/q",
              },
              "dataHost": "127.0.0.1:8080",
              "postgres": {
                "host": "127.0.0.1",
                "port": 6432,
                "ssl": false,
              },
            },
            "plugins": {
              "exporters": {},
              "importers": {
                "csv": ImportCSVPlugin {
                  "opts": {
                    "seafowlClient": undefined,
                  },
                },
              },
            },
          },
          "plugins": {
            "exporters": {},
            "importers": {
              "csv": ImportCSVPlugin {
                "opts": {
                  "seafowlClient": undefined,
                },
              },
            },
          },
        },
      }
    `);
  });
});

// NOTE: It's up to the backend to support rowMode array/object mode
// and at the moment seafowl is only object mode
describe.skipIf(shouldSkipSeafowlTests())("can query local seafowl", () => {
  it("select 1, 2 in (default) object mode in (default) jsonl body mode", async () => {
    const { client } = createDataContext();

    const res = await client.execute<[number, number]>("select 1, 2;", {
      rowMode: "object",
    });

    expect(res.response).toMatchInlineSnapshot(`
      {
        "readable": [Function],
        "rows": [
          {
            "Int64(1)": 1,
            "Int64(2)": 2,
          },
        ],
        "success": true,
      }
    `);
  });
});
