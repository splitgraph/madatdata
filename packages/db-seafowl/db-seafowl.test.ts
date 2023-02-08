import { describe, it, expect } from "vitest";
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
  // const transformRequestHeaders = vi.fn((headers) => ({
  //   ...headers,
  //   foobar: "fizzbuzz",
  // }));

  const db = makeDb({
    database: {
      dbname: "seafowl", // arbitrary
    },
    authenticatedCredential: {
      // @ts-expect-error https://stackoverflow.com/a/70711231
      token: import.meta.env.VITE_TEST_SEAFOWL_SECRET,
      anonymous: false,
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
        csv: new ImportCSVPlugin({}),
      },
      exporters: {},
    },
  });

  return db;
};

describe.skipIf(shouldSkipSeafowlTests())("seafowl stub test", () => {
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
});
