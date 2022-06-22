import { describe, it, expect } from "vitest";
import { makeDb } from "./db-splitgraph";

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
