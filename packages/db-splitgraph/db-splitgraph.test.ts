import { describe, it, expect, vi } from "vitest";
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

    // expect(importResult.response?.success).toEqual(undefined);
    // expect(importResult.error?.success).toEqual(false);
  });
});

describe("importData for ImportCSVPlugin", () => {
  const mswServer = setupServer();
  setupMswServerTestHooks(mswServer);

  // FIXME: should be somewhere else (implementation details of graphql client)
  it("transforms headers as expected", async () => {
    mswServer.use(
      graphql.query("CSVURLs", (req, res, context) => {
        return res(
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

    const transformRequestHeaders = vi.fn((headers) => ({
      ...headers,
      foobar: "fizzbuzz",
    }));

    const db = makeDb({
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

    const { response, error, info } = await db.importData(
      "csv",
      { url: "somesomefoofoo" },
      { tableName: "feefifo" }
    );

    expect(info?.status).toEqual(200);

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

    expect(info?.headers.get("test-echo-foobar")).toEqual("fizzbuzz");
    expect(info?.headers.get("test-echo-x-api-key")).toEqual("xxx");
    expect(info?.headers.get("test-echo-x-api-secret")).toEqual("yyy");
  });
});
