import { describe, it, expect } from "vitest";
import { makeDb } from "./db-splitgraph";

describe("importData", () => {
  it("returns true for plugin csv", async () => {
    const db = makeDb();

    const importResult = await db.importData("csv", {}, {});
    expect(importResult.response?.["success"]).toEqual(true);

    // NOTE: Intellisense is working, but these unknown keys do not cause
    // typechecking errors, because root type is Record<PropertyKey, unknown>
    // This should be fixed for plugins where we know types definitively
    const badResult = await db.importData(
      "csv",
      { xxx: "xxx", xxxxx: "sdsdsds" },
      { tableName: "string", yyy: "xxxx" }
    );
    expect(badResult.response?.["success"]).toEqual(true);
  });

  it("returns false for unknown plugin", async () => {
    const db = makeDb();

    // @ts-expect-error not a key in SplitgraphPluginMap
    const importResult = await db.importData("unknown-doesnotexist", {}, {});

    expect(importResult.response?.["success"]).toEqual(undefined);
    expect(importResult.error?.["success"]).toEqual(false);
  });
});
