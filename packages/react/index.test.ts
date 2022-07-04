import { describe, it, expect } from "vitest";

import { makeDefaultAnonymousContext } from "./index";

describe("makeDefaultAnonymousContext", () => {
  it("initializes as expected", () => {
    expect(makeDefaultAnonymousContext()).toMatchInlineSnapshot(`
      {
        "client": SqlHTTPClient {
          "credential": {
            "anonymous": true,
            "token": "anonymous-token",
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
          "queryUrl": "https://data.splitgraph.com/sql/query/ddn",
        },
        "db": DbSplitgraph {
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
