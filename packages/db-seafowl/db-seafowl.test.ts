import { describe, it, expect, vi } from "vitest";
import { makeDb } from "./db-seafowl";
import { ImportCSVPlugin } from "./plugins/importers/import-csv-seafowl-plugin";

import { shouldSkipSeafowlTests } from "@madatdata/test-helpers/env-config";

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
    plugins: {
      csv: new ImportCSVPlugin({
        transformRequestHeaders,
      }),
    },
  });
};

describe.skipIf(shouldSkipSeafowlTests())("seafowl stub test", () => {
  it("uploads with TableParamsSchema semicolon delimiter", async () => {
    const db = createDb();

    console.log("created db successfully");

    expect(db).toBeTruthy();

    const { response } = await db.importData(
      "csv",
      { data: Buffer.from(`name;candies\r\nBob;5\r\nAlice;10`) },
      {
        tableName: "irrelevant",
        schemaName: "doesntmatter",
      }
    );

    expect((response as any)?.success).toEqual(true);
  });
});
