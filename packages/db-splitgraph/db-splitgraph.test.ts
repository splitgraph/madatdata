import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeDb } from "./db-splitgraph";
import { ImportCSVPlugin } from "./plugins/importers/import-csv-plugin";

import { setupMswServerTestHooks } from "@madatdata/test-helpers/msw-server-hooks";
import { setupMemo } from "@madatdata/test-helpers/setup-memo";
import { compose, graphql, rest } from "msw";

import { defaultHost } from "@madatdata/base-client/host";

describe("importData", () => {
  it("returns false for unknown plugin", async () => {
    const db = makeDb({});

    // @ts-expect-error not a key in SplitgraphPluginMap
    const importResult = await db.importData("unknown-doesnotexist", {}, {});
  });
});

const createDb = () => {
  const transformRequestHeaders = vi.fn((headers) => ({
    ...headers,
    foobar: "fizzbuzz",
  }));

  return makeDb({
    authenticatedCredential: {
      apiKey: "xxx",
      apiSecret: "yyy",
      anonymous: false,
    },
    plugins: {
      csv: new ImportCSVPlugin({
        graphqlEndpoint: defaultHost.baseUrls.gql,
        transformRequestHeaders,
      }),
    },
  });
};

// Useful when writing initial tests against real server (where anon is allowed)
// const _makeAnonymousDb = () => {
//   return makeDb({
//     plugins: {
//       csv: new ImportCSVPlugin({
//         graphqlEndpoint: defaultHost.baseUrls.gql,
//       }),
//     },
//   });
// };

// FIXME: most of this block is graphql client implementation details
describe("importData for ImportCSVPlugin", () => {
  setupMswServerTestHooks();
  setupMemo();

  beforeEach(({ mswServer, testMemo }) => {
    const reqId = testMemo?.takeNext();

    mswServer?.use(
      graphql.query("CSVURLs", (req, res, context) => {
        return res(
          // FIXME: msw handlers should be factored into a common place
          compose(
            context.data({
              csvUploadDownloadUrls: {
                download: `https://data.splitgraph.com:9000/fake-url-download?key=${reqId}`,
                upload: `https://data.splitgraph.com:9000/fake-url-upload?key=${reqId}`,
              },
            }),
            context.set(
              Object.fromEntries(
                Array.from(req.headers.entries()).map(([hk, hv]) => [
                  `TEST-ECHO-${hk}`,
                  hv,
                ])
              )
            )
          )
        );
      }),
      rest.put(
        "https://data.splitgraph.com:9000/fake-url-upload",
        (req, res, context) => {
          console.log("body:", req.body);
          const reqKey = req.url.searchParams.get("key");

          if (reqKey) {
            // testMemo?.findMemo(parseInt(reqKey));
            testMemo?.set(parseInt(reqKey), req.body);
          }

          return res(context.status(200));
        }
      ),
      rest.get(
        "https://data.splitgraph.com:9000/fake-url-download",
        (req, res, context) => {
          const reqKey = req.url.searchParams.get("key");
          if (reqKey) {
            const uploadedBody = testMemo?.findMemo(parseInt(reqKey));
            return res(context.body(uploadedBody));
          }
        }
      )
    );
  });

  it("transforms headers to add auth credential", async () => {
    const db = createDb();
    const { info } = await db.importData(
      "csv",
      { data: Buffer.from("empty_csv") },
      { tableName: "feefifo" }
    );

    expect({
      "test-echo-foobar": info?.presigned?.headers.get("test-echo-foobar"),
      "test-echo-x-api-key": info?.presigned?.headers.get(
        "test-echo-x-api-key"
      ),
      "test-echo-x-api-secret": info?.presigned?.headers.get(
        "test-echo-x-api-secret"
      ),
    }).toMatchInlineSnapshot(`
      {
        "test-echo-foobar": "fizzbuzz",
        "test-echo-x-api-key": "xxx",
        "test-echo-x-api-secret": "yyy",
      }
    `);
  });

  it("transforms headers using _current_ value of authenticatedCredential", async () => {
    const db = createDb();

    const { info: oldCredInfo } = await db.importData(
      "csv",
      { data: Buffer.from("empty_csv") },
      { tableName: "feefifo" }
    );

    expect(oldCredInfo?.presigned?.headers.get("test-echo-x-api-key")).toEqual(
      "xxx"
    );
    expect(
      oldCredInfo?.presigned?.headers.get("test-echo-x-api-secret")
    ).toEqual("yyy");

    // Ensure it uses the new credential after updating it
    db.setAuthenticatedCredential({
      apiKey: "jjj",
      apiSecret: "ccc",
      anonymous: false,
    });

    const { info } = await db.importData(
      "csv",
      { data: Buffer.from("empty_csv") },
      { tableName: "feefifo" }
    );
    expect(info?.presigned?.headers.get("test-echo-x-api-key")).toEqual("jjj");
    expect(info?.presigned?.headers.get("test-echo-x-api-secret")).toEqual(
      "ccc"
    );
  });

  it("returns expected graphql response (will change during tdd)", async ({
    testMemo,
  }) => {
    const db = createDb();

    const { response, error } = await db.importData(
      "csv",
      { data: Buffer.from("empty_csv") },
      { tableName: "feefifo" }
    );

    expect({ response, error }).toMatchInlineSnapshot(`
      {
        "error": null,
        "response": {
          "success": true,
          "uploadedTo": "https://data.splitgraph.com:9000/fake-url-download?key=${testMemo?.last}",
        },
      }
    `);

    const download = `https://data.splitgraph.com:9000/fake-url-download?key=${testMemo?.last}`;

    const resulting = await fetch(download).then((response) => response.text());

    expect(resulting).toMatchInlineSnapshot('"empty_csv"');
  });

  it("uploads a file and then serves it back from its keyed URL", async ({
    testMemo,
  }) => {
    const db = createDb();

    await db.importData(
      "csv",
      { data: Buffer.from(`name,birthday\r\nFOO_COL_KEY,BAR_COL_VAL`) },
      { tableName: "irrelevant" }
    );

    const download = `https://data.splitgraph.com:9000/fake-url-download?key=${testMemo?.last}`;

    const resulting = await fetch(download).then((response) => response.text());

    expect(resulting).toMatchInlineSnapshot(`
      "name,birthday
      FOO_COL_KEY,BAR_COL_VAL"
    `);
  });
});
