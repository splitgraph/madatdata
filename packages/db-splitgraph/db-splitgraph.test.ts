import { describe, it, expect, vi } from "vitest";
import { makeDb } from "./db-splitgraph";
import { ImportCSVPlugin } from "./plugins/importers/import-csv-plugin";

describe("importData", () => {
  it("returns true for plugin csv", async () => {
    const db = makeDb({});

    const importResult = await db.importData(
      "csv",
      { url: "foo" },
      { graphqlEndpoint: "foo", tableName: "yyyy" }
    );

    expect(importResult.response?.["success"]).toEqual(true);

    const badSourceOpts = await db.importData(
      "csv",
      // @ts-expect-error Invalid property
      { yyyy: "xxxx" },
      // NOTE: expect error here too, but assertion stops eval after first error
      { yyy: "xxxx" }
    );

    expect(badSourceOpts.response?.success).toEqual(undefined);

    const badDestOpts = await db.importData(
      "csv",
      { url: "bogus" },
      // @ts-expect-error Invalid property
      { yyy: "xxxx" }
    );

    expect(badDestOpts.response?.success).toEqual(undefined);
  });

  it("returns false for unknown plugin", async () => {
    const db = makeDb({});

    // @ts-expect-error not a key in SplitgraphPluginMap
    const importResult = await db.importData("unknown-doesnotexist", {}, {});

    expect(importResult.response?.success).toEqual(undefined);
    expect(importResult.error?.success).toEqual(false);
  });
});

describe("importData - csv", () => {
  it("returns true for plugin csv", async () => {
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
          graphqlEndpoint: "the endpoint",
          transformRequestHeaders,
        }),
      },
    });

    await db.importData(
      "csv",
      { url: "somesomefoofoo" },
      { graphqlEndpoint: "gqlendpoint", tableName: "feefifo" }
    );

    // We specified `transformRequestHeaders` in the constructor, but the Db can
    // create a new instance of the plugin, e.g. to add auth headers
    expect(transformRequestHeaders).toHaveBeenCalled();

    // expect
  });
});
