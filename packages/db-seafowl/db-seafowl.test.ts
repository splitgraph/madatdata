import { describe, it, expect, vi } from "vitest";
import { makeDb } from "./db-seafowl";
import { ImportCSVPlugin } from "./plugins/importers/import-csv-seafowl-plugin";

import { shouldSkipSeafowlTests } from "@madatdata/test-helpers/env-config";

describe("importData", () => {
  it("returns false for unknown plugin", async () => {
    let err: unknown;
    const db = makeDb({});

    await db
      // @ts-expect-error typescript shouldn't allow using a plugin name not in map
      .importData("unknown-doesnotexist", {}, {})
      .catch((e) => {
        err = e;
      });

    expect(err).toMatchInlineSnapshot(
      "[Error: plugin not found: unknown-doesnotexist]"
    );
  });
});

const createDb = () => {
  const transformRequestHeaders = vi.fn((headers) => ({
    ...headers,
    foobar: "fizzbuzz",
  }));

  return makeDb({
    database: {
      dbname: "seafowl", // arbitrary
    },
    host: {
      // temporary hacky mess
      dataHost: "127.0.0.1:8080",
      apexDomain: "bogus",
      apiHost: "bogus",
      baseUrls: {
        gql: "bogus",
        sql: "http://127.0.0.1:8080/q",
        auth: "bogus",
      },
      postgres: {
        host: "127.0.0.1",
        port: 6432,
        ssl: false,
      },
    },
    plugins: {
      importers: {
        csv: new ImportCSVPlugin({
          transformRequestHeaders,
        }),
      },
      exporters: {},
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

  it("can fingerprint with sha256 by default", async () => {
    const db = createDb();

    const fingerprint = await db.fingerprintQuery("select 1");

    expect(fingerprint).toMatchInlineSnapshot(`
      {
        "fingerprint": "822ae07d4783158bc1912bb623e5107cc9002d519e1143a9c200ed6ee18b6d0f",
        "normalized": "select 1",
      }
    `);
  });

  // it("can make a query to localhost", async () => {
  //   const db = createDb();

  // });
});
