import { describe, it, expect, beforeEach } from "vitest";

import {
  parseFieldsFromResponseBodyJSONFieldsKey,
  skipParsingFieldsFromResponse,
} from "@madatdata/client-http";

import { rest } from "msw";

import { setupMswServerTestHooks } from "@madatdata/test-helpers/msw-server-hooks";
import { setupMemo } from "@madatdata/test-helpers/setup-memo";

import type { IsomorphicRequest } from "@mswjs/interceptors";

import { createDataContext } from "./test-helpers/splitgraph-test-helpers";
import { makeSplitgraphHTTPContext } from "./splitgraph";

const minSuccessfulJSON = {
  success: true,
  command: "SELECT",
  rowCount: 1,
  rows: [
    {
      "?column?": 1,
    },
  ],
  fields: [
    {
      name: "?column?",
      tableID: 0,
      columnID: 0,
      dataTypeID: 23,
      dataTypeSize: 4,
      dataTypeModifier: -1,
      format: "text",
      formattedType: "INT4",
    },
  ],
  executionTime: "128ms",
  executionTimeHighRes: "0s 128.383115ms",
};

describe("simplified interface", () => {
  it("can be called with no options", () => {
    const simplifiedContext = makeSplitgraphHTTPContext();

    expect(
      // @ts-expect-error Abuse private property "credential" to avoid giant snapshot serialization
      simplifiedContext.client.credential
    ).toMatchInlineSnapshot(`
      {
        "anonymous": true,
        "token": "anonymous-token",
      }
    `);

    expect(
      // @ts-expect-error Abuse private property "credential" to avoid giant snapshot serialization
      simplifiedContext.client.host
    ).toMatchInlineSnapshot(`
      {
        "apexDomain": "splitgraph.com",
        "apiHost": "api.splitgraph.com",
        "baseUrls": {
          "auth": "https://api.splitgraph.com/auth",
          "gql": "https://api.splitgraph.com/gql/cloud/unified/graphql",
          "sql": "https://data.splitgraph.com/sql/query",
        },
        "dataHost": "data.splitgraph.com",
        "postgres": {
          "host": "data.splitgraph.com",
          "port": 5432,
          "ssl": true,
        },
      }
    `);
  });
});

describe("makeSplitgraphHTTPContext with http strategies", () => {
  setupMswServerTestHooks();
  setupMemo();

  beforeEach(({ mswServer, useTestMemo, meta }) => {
    const reqMemo = useTestMemo!<string, IsomorphicRequest>();

    mswServer?.use(
      rest.post("http://localhost/some/ddn/endpoint", (req, res, ctx) => {
        reqMemo.set(meta.id, req);
        return res(
          ctx.status(200),
          ctx.body(
            JSON.stringify({
              ...minSuccessfulJSON,
            })
          )
        );
      })
    );
  });

  it("sets strategies", async ({ useTestMemo, meta }) => {
    const ctx = createDataContext({
      credential: null,
      strategies: {
        async makeQueryURL() {
          return Promise.resolve("http://localhost/some/ddn/endpoint");
        },
        makeFetchOptions() {
          return null;
        },
        parseFieldsFromResponse: skipParsingFieldsFromResponse,
        parseFieldsFromResponseBodyJSON:
          parseFieldsFromResponseBodyJSONFieldsKey,
        transformFetchOptions: ({ input, init }) => {
          return {
            input,
            init: {
              ...init,
              headers: {
                ...init?.headers,
                "new-header": "was-not-in-initial-headers",

                // !!!! TODO: Warn about? Fix this?
                // NOTE: header name is lowercase, but original is Content-Type. If both
                // keys are there, then they are duplicate keys and get appended to each other,
                // rather than overwriting.
                "content-type":
                  "appended-to-content-type-because-duplicate-keys",
              },
            },
          };
        },
      },
    });

    expect(ctx.client).toBeTruthy();
    expect(ctx.db).toBeTruthy();

    const resp = await ctx.client.execute<{}>("SELECT 1;");

    expect(resp).toMatchInlineSnapshot(`
      {
        "error": null,
        "response": {
          "command": "SELECT",
          "executionTime": "128ms",
          "executionTimeHighRes": "0s 128.383115ms",
          "fields": [
            {
              "columnID": 0,
              "dataTypeID": 23,
              "dataTypeModifier": -1,
              "dataTypeSize": 4,
              "format": "text",
              "formattedType": "INT4",
              "name": "?column?",
              "tableID": 0,
            },
          ],
          "readable": [Function],
          "rowCount": 1,
          "rows": [
            {
              "?column?": 1,
            },
          ],
          "success": true,
        },
      }
    `);

    const reqMemo = useTestMemo!().get(meta.id) as IsomorphicRequest;
    expect(reqMemo["headers"]).toMatchInlineSnapshot(`
      HeadersPolyfill {
        Symbol(normalizedHeaders): {
          "content-type": "application/json, appended-to-content-type-because-duplicate-keys",
          "new-header": "was-not-in-initial-headers",
        },
        Symbol(rawHeaderNames): Map {
          "content-type" => "content-type",
          "new-header" => "new-header",
        },
      }
    `);

    // NOTE: See note above. This was _appended_ because different casing made duplicate keys
    expect(reqMemo["headers"].get("content-type")).toMatchInlineSnapshot(
      '"application/json, appended-to-content-type-because-duplicate-keys"'
    );
  });
});

describe("makeSplitgraphHTTPContext", () => {
  setupMswServerTestHooks();

  it("initializes as expected", async () => {
    const ctx = createDataContext({
      authenticatedCredential: {
        apiKey: "xxx",
        apiSecret: "yyy",
        anonymous: false,
      },
    });

    expect(ctx.client).toBeTruthy();
    expect(ctx.db).toBeTruthy();

    expect({ client: ctx.client, db: ctx.db }).toMatchInlineSnapshot(`
      {
        "client": SqlHTTPClient {
          "bodyMode": "json",
          "credential": {
            "anonymous": false,
            "apiKey": "xxx",
            "apiSecret": "yyy",
          },
          "database": {
            "dbname": "ddn",
          },
          "host": {
            "apexDomain": "splitgraph.com",
            "apiHost": "api.splitgraph.com",
            "baseUrls": {
              "auth": "https://api.splitgraph.com/auth",
              "gql": "https://api.splitgraph.com/gql/cloud/unified/graphql",
              "sql": "https://data.splitgraph.com/sql/query",
            },
            "dataHost": "data.splitgraph.com",
            "postgres": {
              "host": "data.splitgraph.com",
              "port": 5432,
              "ssl": true,
            },
          },
          "strategies": {
            "makeFetchOptions": [Function],
            "makeQueryURL": [Function],
            "parseFieldsFromResponse": [Function],
            "parseFieldsFromResponseBodyJSON": [Function],
            "transformFetchOptions": [Function],
          },
        },
        "db": DbSplitgraph {
          "authenticatedCredential": {
            "anonymous": false,
            "apiKey": "xxx",
            "apiSecret": "yyy",
          },
          "database": {
            "dbname": "ddn",
          },
          "graphqlEndpoint": "https://api.splitgraph.com/gql/cloud/unified/graphql",
          "host": {
            "apexDomain": "splitgraph.com",
            "apiHost": "api.splitgraph.com",
            "baseUrls": {
              "auth": "https://api.splitgraph.com/auth",
              "gql": "https://api.splitgraph.com/gql/cloud/unified/graphql",
              "sql": "https://data.splitgraph.com/sql/query",
            },
            "dataHost": "data.splitgraph.com",
            "postgres": {
              "host": "data.splitgraph.com",
              "port": 5432,
              "ssl": true,
            },
          },
          "opts": {
            "authenticatedCredential": {
              "anonymous": false,
              "apiKey": "xxx",
              "apiSecret": "yyy",
            },
            "database": {
              "dbname": "ddn",
            },
            "host": {
              "apexDomain": "splitgraph.com",
              "apiHost": "api.splitgraph.com",
              "baseUrls": {
                "auth": "https://api.splitgraph.com/auth",
                "gql": "https://api.splitgraph.com/gql/cloud/unified/graphql",
                "sql": "https://data.splitgraph.com/sql/query",
              },
              "dataHost": "data.splitgraph.com",
              "postgres": {
                "host": "data.splitgraph.com",
                "port": 5432,
                "ssl": true,
              },
            },
            "plugins": [
              SplitgraphImportCSVPlugin {
                "__name": "csv",
                "graphqlClient": SplitgraphGraphQLClient {
                  "graphqlClient": GraphQLClient {
                    "options": {
                      "headers": [Function],
                    },
                    "url": "https://api.splitgraph.com/gql/cloud/unified/graphql",
                  },
                  "graphqlEndpoint": "https://api.splitgraph.com/gql/cloud/unified/graphql",
                  "transformRequestHeaders": [Function],
                },
                "graphqlEndpoint": "https://api.splitgraph.com/gql/cloud/unified/graphql",
                "opts": {
                  "graphqlEndpoint": "https://api.splitgraph.com/gql/cloud/unified/graphql",
                  "transformRequestHeaders": [Function],
                },
                "transformRequestHeaders": [Function],
              },
              SplitgraphExportQueryToFilePlugin {
                "__name": "export-query-to-file",
                "graphqlClient": SplitgraphGraphQLClient {
                  "graphqlClient": GraphQLClient {
                    "options": {
                      "headers": [Function],
                    },
                    "url": "https://api.splitgraph.com/gql/cloud/unified/graphql",
                  },
                  "graphqlEndpoint": "https://api.splitgraph.com/gql/cloud/unified/graphql",
                  "transformRequestHeaders": [Function],
                },
                "graphqlEndpoint": "https://api.splitgraph.com/gql/cloud/unified/graphql",
                "opts": {
                  "graphqlEndpoint": "https://api.splitgraph.com/gql/cloud/unified/graphql",
                  "transformRequestHeaders": [Function],
                },
                "transformRequestHeaders": [Function],
              },
            ],
          },
          "plugins": PluginRegistry {
            "hostContext": {},
            "plugins": [
              SplitgraphImportCSVPlugin {
                "__name": "csv",
                "graphqlClient": SplitgraphGraphQLClient {
                  "graphqlClient": GraphQLClient {
                    "options": {
                      "headers": [Function],
                    },
                    "url": "https://api.splitgraph.com/gql/cloud/unified/graphql",
                  },
                  "graphqlEndpoint": "https://api.splitgraph.com/gql/cloud/unified/graphql",
                  "transformRequestHeaders": [Function],
                },
                "graphqlEndpoint": "https://api.splitgraph.com/gql/cloud/unified/graphql",
                "opts": {
                  "graphqlEndpoint": "https://api.splitgraph.com/gql/cloud/unified/graphql",
                  "transformRequestHeaders": [Function],
                },
                "transformRequestHeaders": [Function],
              },
              SplitgraphExportQueryToFilePlugin {
                "__name": "export-query-to-file",
                "graphqlClient": SplitgraphGraphQLClient {
                  "graphqlClient": GraphQLClient {
                    "options": {
                      "headers": [Function],
                    },
                    "url": "https://api.splitgraph.com/gql/cloud/unified/graphql",
                  },
                  "graphqlEndpoint": "https://api.splitgraph.com/gql/cloud/unified/graphql",
                  "transformRequestHeaders": [Function],
                },
                "graphqlEndpoint": "https://api.splitgraph.com/gql/cloud/unified/graphql",
                "opts": {
                  "graphqlEndpoint": "https://api.splitgraph.com/gql/cloud/unified/graphql",
                  "transformRequestHeaders": [Function],
                },
                "transformRequestHeaders": [Function],
              },
            ],
          },
        },
      }
    `);
  });
});
