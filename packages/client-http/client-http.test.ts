import { describe, it, expect, beforeEach } from "vitest";
import { makeClient, type Strategies } from "./client-http";
import { makeAuthHeaders } from "@madatdata/base-client";
import { setupMswServerTestHooks } from "@madatdata/test-helpers/msw-server-hooks";
import { shouldSkipIntegrationTests } from "@madatdata/test-helpers/env-config";
import { rest } from "msw";

import { defaultHost } from "@madatdata/base-client/host";

// NOTE: Previously, the default http-client was hardcoded for Splitgraph, which
// is why all the tests reflect its shape. But we don't want this package to
// depend on db-splitgraph, so we copy the strategies from DbSplitgraph.makeHTTPClient
// even though ideally, these tests wouldn't be hardcoded to Splitgrpaph endpoints
// anyway. But as long as we have the mocks for them, these defaults make sense.
// Going forward, http client tests can/should use more generic callbacks and mocks
const splitgraphClientOptions = {
  bodyMode: "json",
  strategies: {
    makeFetchOptions: ({ credential, query, execOptions }) => {
      // HACKY: atm, splitgraph API does not accept "object" as valid param
      // so remove it from execOptions (hacky because ideal is `...execOptions`)
      const httpExecOptions =
        execOptions?.rowMode === "object"
          ? (({ rowMode, ...rest }) => rest)(execOptions)
          : execOptions;

      return {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...makeAuthHeaders(
            credential
          ) /* fixme: smell? prefer `this.credential`? */,
        },
        body: JSON.stringify({ sql: query, ...httpExecOptions }),
      };
    },
    makeQueryURL: async ({ host, database }) => {
      return Promise.resolve(host.baseUrls.sql + "/" + database.dbname);
    },
  } as Strategies,
};

describe("makeClient creates a client which", () => {
  setupMswServerTestHooks();

  beforeEach(({ mswServer }) => {
    mswServer?.use(
      rest.post(defaultHost.baseUrls.sql + "/ddn", (_req, res, ctx) => {
        return res(
          ctx.json({
            success: true,
            command: "SELECT",
            rowCount: 1,
            rows: [
              {
                "?column?": 1,
              },
            ],
            fields: [
              {
                name: "?column?",
                tableID: 0,
                columnID: 0,
                dataTypeID: 23,
                dataTypeSize: 4,
                dataTypeModifier: -1,
                format: "text",
                formattedType: "INT4",
              },
            ],
            executionTime: "128ms",
            executionTimeHighRes: "0s 128.383115ms",
          })
        );
      })
    );
  });

  it("receives SELECT 1 with expected metadata shape", async () => {
    const client = makeClient({
      credential: null,
      ...splitgraphClientOptions,
    });

    const result = await client.execute<{ "?column?": number }>("SELECT 1;");

    expect(result.response?.rows[0]["?column?"]).toEqual(1);

    expect(snapshotResult(result)).toMatchInlineSnapshot(`
      {
        "error": null,
        "response": {
          "command": "SELECT",
          "fields": [
            {
              "columnID": 0,
              "dataTypeID": 23,
              "dataTypeModifier": -1,
              "dataTypeSize": 4,
              "format": "text",
              "formattedType": "INT4",
              "name": "?column?",
              "tableID": 0,
            },
          ],
          "rowCount": 1,
          "rows": [
            {
              "?column?": 1,
            },
          ],
          "success": true,
        },
      }
    `);
  });
});

describe.skipIf(shouldSkipIntegrationTests())("http integration tests", () => {
  it("can select 1 from real ddn", async () => {
    const client = makeClient({
      credential: null,
      ...splitgraphClientOptions,
    });

    const result = await client.execute<{ "?column?": number }>("SELECT 1;");

    expect(snapshotResult(result)).toMatchInlineSnapshot(`
      {
        "error": null,
        "response": {
          "command": "SELECT",
          "fields": [
            {
              "columnID": 0,
              "dataTypeID": 23,
              "dataTypeModifier": -1,
              "dataTypeSize": 4,
              "format": "text",
              "formattedType": "INT4",
              "name": "?column?",
              "tableID": 0,
            },
          ],
          "rowCount": 1,
          "rows": [
            {
              "?column?": 1,
            },
          ],
          "success": true,
        },
      }
    `);
  });

  // NOTE: This is an error in how Splitgraph serializes query results to JSON
  // and needs a deeper fix. It's left here as a canary for when it is fixed.
  // See client-postgres.test.ts for similar in postgres
  it("can select 1, 2, 3 from real ddn", async () => {
    const client = makeClient({
      credential: null,
      ...splitgraphClientOptions,
    });

    const result = await client.execute<{ "?column?": number }>(
      "SELECT 1, 2, 3;"
    );

    // Note how the result only includes an object with the last column value,
    // because all columns have the same key name of ?column?
    expect(snapshotResult(result)).toMatchInlineSnapshot(`
      {
        "error": null,
        "response": {
          "command": "SELECT",
          "fields": [
            {
              "columnID": 0,
              "dataTypeID": 23,
              "dataTypeModifier": -1,
              "dataTypeSize": 4,
              "format": "text",
              "formattedType": "INT4",
              "name": "?column?",
              "tableID": 0,
            },
            {
              "columnID": 0,
              "dataTypeID": 23,
              "dataTypeModifier": -1,
              "dataTypeSize": 4,
              "format": "text",
              "formattedType": "INT4",
              "name": "?column?",
              "tableID": 0,
            },
            {
              "columnID": 0,
              "dataTypeID": 23,
              "dataTypeModifier": -1,
              "dataTypeSize": 4,
              "format": "text",
              "formattedType": "INT4",
              "name": "?column?",
              "tableID": 0,
            },
          ],
          "rowCount": 1,
          "rows": [
            {
              "?column?": 3,
            },
          ],
          "success": true,
        },
      }
    `);
  });

  // NOTE: The fundamental JSON serialization problem does not exist when using
  // rowMode: "array". No information is lost, each unique column value is there
  it("can select 1, 2, 3 from real ddn in row mode", async () => {
    const client = makeClient({
      credential: null,
      ...splitgraphClientOptions,
    });

    const result = await client.execute<
      [once: number, twice: number, thrice: number]
    >("SELECT 1, 2, 3;", { rowMode: "array" });

    expect(
      result.response?.rows.map(([first, second, third]) => [
        first,
        second,
        third,
      ])
    ).toBeTruthy();

    expect(result.response?.rows).toMatchInlineSnapshot(`
      [
        [
          1,
          2,
          3,
        ],
      ]
    `);

    expect(snapshotResult(result)).toMatchInlineSnapshot(`
      {
        "error": null,
        "response": {
          "command": "SELECT",
          "fields": [
            {
              "columnID": 0,
              "dataTypeID": 23,
              "dataTypeModifier": -1,
              "dataTypeSize": 4,
              "format": "text",
              "formattedType": "INT4",
              "name": "?column?",
              "tableID": 0,
            },
            {
              "columnID": 0,
              "dataTypeID": 23,
              "dataTypeModifier": -1,
              "dataTypeSize": 4,
              "format": "text",
              "formattedType": "INT4",
              "name": "?column?",
              "tableID": 0,
            },
            {
              "columnID": 0,
              "dataTypeID": 23,
              "dataTypeModifier": -1,
              "dataTypeSize": 4,
              "format": "text",
              "formattedType": "INT4",
              "name": "?column?",
              "tableID": 0,
            },
          ],
          "rowCount": 1,
          "rows": [
            [
              1,
              2,
              3,
            ],
          ],
          "success": true,
        },
      }
    `);
  });
});

const snapshotResult = (result: any) => {
  delete result.response?.["executionTime"];
  delete result.response?.["executionTimeHighRes"];
  return result;
};

// NOTE: Copied (non-DRY) from postgres test (maybe it should be in base then)
// NOTE: .skip() because this code is intended for typechecking, not running
// (it is _slightly_ different since http-client wraps the result)
describe.skip("type checking produces expected errors in", async () => {
  it("client-http.execute function overloading", async () => {
    const client = makeClient({
      credential: null,
      ...splitgraphClientOptions,
    });

    const badObjectType = await client.execute<{ "?column?": number }>(
      "select 1, 2, 3, 4, 5;",
      // @ts-expect-error rowMode "array" should error when generic param is not array
      { rowMode: "array" }
    );

    const badArrayType = await client.execute<[number, number]>("select 1,2", {
      // @ts-expect-error rowMode "object" should error when generic param is not object
      rowMode: "object",
    });

    // @ts-expect-error array generic param should error when no opts (default rowMode: object)
    const badArrayTypeNoOptions = await client.execute<[number, number]>(
      "select 1,2"
    );

    const goodObjectType = await client.execute<{ apple: number }>(
      "select 1 as apple;"
    );
    goodObjectType.response?.rows.map(({ apple }) => ({ apple }));

    const goodRowType = await client.execute<[number, number]>("select 1, 2;", {
      rowMode: "array",
    });

    goodObjectType.response?.rows.map(
      ({
        apple,
        // @ts-expect-error Key does not exist on generic param
        pear,
      }) => ({ apple })
    );

    await client.execute<{ pear: "green" }>("something", { rowMode: "object" });
    await client.execute<[number, number]>("something", { rowMode: "array" });

    await client.execute<
      // @ts-expect-error should error on array shape when rowMode option omitted
      [number, number]
    >("something");

    await client.execute<[number, number]>("something", {
      // @ts-expect-error should error on array shape when rowMode is object
      rowMode: "object",
    });

    await client.execute<{ apple: "magenta" }>("something", {
      // @ts-expect-error should error on object shape when rowMode is array
      rowMode: "array",
    });

    // NOTE: We rely on ts-expect-error to check that types work as expected,
    // since if there is *no* error, the pragma itself will produce an error. But
    // a ts-expect-error above an unused variable always "catches" that error,
    // even if it's not the specific error we were hoping for, so we need to
    // avoid an unused variable where we check for a different expected error

    // To avoid this, ensure we "use" all variables (none of this code is run)
    return { badObjectType, badArrayType, badArrayTypeNoOptions, goodRowType };
  });
});
