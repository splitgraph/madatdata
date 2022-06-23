import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { makeDb } from "./db-splitgraph";
import { ImportCSVPlugin } from "./plugins/importers/import-csv-plugin";

import { setupServer } from "msw/node";
import { setupMswServerTestHooks } from "@madatdata/test-helpers/msw-server-hooks";
import { compose, graphql } from "msw";

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

describe("importData for ImportCSVPlugin", () => {
  const mswServer = setupServer();
  setupMswServerTestHooks(mswServer);

  beforeEach(() => {
    mswServer.use(
      graphql.query("CSVURLs", (req, res, context) => {
        return res(
          // FIXME: msw handlers should be factored into a common place
          compose(
            context.data({
              csvUploadDownloadUrls: {
                download: "https://data.splitgraph.com:9000/fake-url-download",
                upload: "https://data.splitgraph.com:9000/fake-url-upload",
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
      })
    );
  });

  // FIXME: should be somewhere else (implementation details of graphql client)
  it("transforms headers to add auth credential", async () => {
    const db = createDb();
    const { info } = await db.importData(
      "csv",
      { url: "somesomefoofoo" },
      { tableName: "feefifo" }
    );

    expect({
      "test-echo-foobar": info?.headers.get("test-echo-foobar"),
      "test-echo-x-api-key": info?.headers.get("test-echo-x-api-key"),
      "test-echo-x-api-secret": info?.headers.get("test-echo-x-api-secret"),
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
      { url: "somesomefoofoo" },
      { tableName: "feefifo" }
    );

    expect(oldCredInfo?.headers.get("test-echo-x-api-key")).toEqual("xxx");
    expect(oldCredInfo?.headers.get("test-echo-x-api-secret")).toEqual("yyy");

    // Ensure it uses the new credential after updating it
    db.setAuthenticatedCredential({
      apiKey: "jjj",
      apiSecret: "ccc",
      anonymous: false,
    });

    const { info } = await db.importData(
      "csv",
      { url: "somesomefoofoo" },
      { tableName: "feefifo" }
    );
    expect(info?.headers.get("test-echo-x-api-key")).toEqual("jjj");
    expect(info?.headers.get("test-echo-x-api-secret")).toEqual("ccc");
  });

  it("returns expected graphql response (will change during tdd)", async () => {
    const db = createDb();

    const { response, error, info } = await db.importData(
      "csv",
      { url: "somesomefoofoo" },
      { tableName: "feefifo" }
    );

    expect(info?.status).toEqual(200);

    expect({ response, error }).toMatchInlineSnapshot(`
      {
        "error": null,
        "response": {
          "csvUploadDownloadUrls": {
            "download": "https://data.splitgraph.com:9000/fake-url-download",
            "upload": "https://data.splitgraph.com:9000/fake-url-upload",
          },
        },
      }
    `);
  });
});
