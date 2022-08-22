import { describe, it, expect } from "vitest";

import { makeSeafowlHTTPContext } from "./seafowl";
import { setupMswServerTestHooks } from "@madatdata/test-helpers/msw-server-hooks";
import { shouldSkipSeafowlTests } from "@madatdata/test-helpers/env-config";

const createDataContext = () => {
  return makeSeafowlHTTPContext({
    database: {
      dbname: "seafowl", // arbitrary
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

    expect(ctx).toMatchInlineSnapshot(`
      {
        "client": SqlHTTPClient {
          "bodyMode": "jsonl",
          "credential": {
            "anonymous": true,
            "token": "anonymous-token",
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
            "csv": ImportCSVPlugin {
              "opts": {
                "transformRequestHeaders": [Function],
              },
              "transformRequestHeaders": [Function],
            },
          },
        },
      }
    `);
  });
});

describe.skipIf(shouldSkipSeafowlTests())("can query local seafowl", () => {
  // NOTE: EXPECTED TO BE FAILING RIGHT NOW (snapshot matches an error)
  it("select 1, 2", async () => {
    const { client } = createDataContext();

    const res = await client.execute<[number, number]>("select 1, 2;", {
      rowMode: "array",
    });

    expect(res).toMatchInlineSnapshot(`
      {
        "error": null,
        "response": [
          {
            "Int64(1)": 1,
            "Int64(2)": 2,
          },
        ],
      }
    `);
  });
});
