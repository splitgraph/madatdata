import { describe, it, expect } from "vitest";
import { makeDb } from "./db-splitgraph";

describe("importData", () => {
  it("returns true for plugin csv", async () => {
    const db = makeDb();

    const importResult = await db.importData(
      "csv",
      { url: "fff" },
      { tableName: "string" }
    );
    expect(importResult.response?.success).toEqual(true);
  });

  it("returns false for plugin not csv", async () => {
    const db = makeDb();

    // @ts-expect-error "mysql" is not a key in SplitgraphPluginMap
    const importResult = await db.importData("mysql", {}, {});

    expect(importResult.response?.success).toEqual(undefined);
    expect(importResult.error?.success).toEqual(false);
  });
});
