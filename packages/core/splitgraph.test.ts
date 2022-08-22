import { describe, it, expect } from "vitest";

import { makeSplitgraphHTTPContext } from "./splitgraph";
import { setupMswServerTestHooks } from "@madatdata/test-helpers/msw-server-hooks";

describe("makeSplitgraphHTTPContext", () => {
  setupMswServerTestHooks();

  it("initializes as expected", async () => {
    const ctx = makeSplitgraphHTTPContext({
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
          "plugins": {
            "csv": _ImportCSVPlugin {
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
          },
        },
      }
    `);
  });
});
