import { describe, it, expect, beforeEach } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";

import { setupMswServerTestHooks } from "@madatdata/test-helpers/msw-server-hooks";
import {
  render,
  setupReactTestingLibrary,
} from "@madatdata/test-helpers/setup-react-testing-library";
import { rest } from "msw";

import { defaultHost } from "@madatdata/core";
import { HelloButton, SqlProvider, useSql } from "./hooks";

import { makeSplitgraphHTTPContext } from "@madatdata/core";

const makeDefaultAnonymousContext = () => {
  const defaultAnonymousContext = makeSplitgraphHTTPContext({
    credential: null,
  });

  return defaultAnonymousContext;
};

const DebugQuery = () => {
  const { loading, error, response } = useSql<{ "?column?": number }>(
    `SELECT 99;`
  );

  return (
    <pre
      style={{ minWidth: "100%", minHeight: 500 }}
      data-testid={`result-pre-${
        loading ? "loading" : response ? "pass" : error ? "fail" : "unknown"
      }`}
    >
      {JSON.stringify({ loading, error, response }, null, 2)}
    </pre>
  );
};

describe("hooks", () => {
  setupMswServerTestHooks();
  setupReactTestingLibrary();

  beforeEach(({ mswServer }) => {
    mswServer?.use(
      rest.post(defaultHost.baseUrls.sql + "/ddn", (_req, res, ctx) => {
        return res(
          ctx.json({
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
          })
        );
      })
    );
  });

  it("renders the hello/goodbye button and toggles it on click", async () => {
    render(<HelloButton />);

    const helloButton = screen.getByRole("button", { name: "hello" });
    fireEvent.click(helloButton);
    await screen.findByText("goodbye");

    const goodbyeButton = screen.getByRole("button", { name: "goodbye" });
    fireEvent.click(goodbyeButton);
    await screen.findByText("hello");
  });

  it("renders the sql according to the mock", async () => {
    render(
      <SqlProvider dataContext={makeDefaultAnonymousContext()}>
        <DebugQuery />
      </SqlProvider>
    );

    await waitFor(() => screen.getByTestId("result-pre-loading"));
    const prePass = await waitFor(() => screen.getByTestId("result-pre-pass"));

    expect(prePass.textContent).toMatchInlineSnapshot(`
      "{
        \\"loading\\": false,
        \\"error\\": null,
        \\"response\\": {
          \\"success\\": true,
          \\"command\\": \\"SELECT\\",
          \\"rowCount\\": 1,
          \\"rows\\": [
            {
              \\"?column?\\": 1
            }
          ],
          \\"fields\\": [
            {
              \\"name\\": \\"?column?\\",
              \\"tableID\\": 0,
              \\"columnID\\": 0,
              \\"dataTypeID\\": 23,
              \\"dataTypeSize\\": 4,
              \\"dataTypeModifier\\": -1,
              \\"format\\": \\"text\\",
              \\"formattedType\\": \\"INT4\\"
            }
          ],
          \\"executionTime\\": \\"128ms\\",
          \\"executionTimeHighRes\\": \\"0s 128.383115ms\\"
        }
      }"
    `);
  });
});

describe("makeDefaultAnonymousContext", () => {
  it("initializes as expected", () => {
    expect(makeDefaultAnonymousContext()).toMatchInlineSnapshot(`
      {
        "client": SqlHTTPClient {
          "bodyMode": "json",
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
          "strategies": {
            "makeFetchOptions": [Function],
            "makeQueryURL": [Function],
            "parseFieldsFromResponse": [Function],
            "parseFieldsFromResponseBodyJSON": [Function],
            "transformFetchOptions": [Function],
          },
        },
        "db": DbSplitgraph {
          "authenticatedCredential": undefined,
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
            "authenticatedCredential": undefined,
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
              _ExportQueryPlugin {
                "__name": "exportQuery",
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
              _ExportQueryPlugin {
                "__name": "exportQuery",
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
