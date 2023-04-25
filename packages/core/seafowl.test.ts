import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { makeSeafowlHTTPContext } from "./seafowl";
import { setupMswServerTestHooks } from "@madatdata/test-helpers/msw-server-hooks";
import { shouldSkipSeafowlTests } from "@madatdata/test-helpers/env-config";
import type { Host } from "@madatdata/base-client";
import {
  parseFieldsFromResponseContentTypeHeader,
  skipParsingFieldsFromResponseBodyJSON,
  skipTransformFetchOptions,
} from "@madatdata/client-http";
import { rest } from "msw";

import {
  tableFromJSON,
  Schema,
  Field,
  Table,
  vectorFromArray,
  Vector,
  RecordBatch,
} from "apache-arrow";
import * as dtypes from "apache-arrow/type";
import { faker } from "@faker-js/faker";

// @ts-expect-error https://stackoverflow.com/a/70711231
const SEAFOWL_SECRET = import.meta.env.VITE_TEST_SEAFOWL_SECRET;

// Depending on whether SEAFOWL_SECRET is defined (might not be in CI), we expect
// serialized credentials to include different values
const expectAnonymous = !SEAFOWL_SECRET;
const expectToken = SEAFOWL_SECRET ?? "anonymous-token";

export const createDataContext = (
  opts?: Parameters<typeof makeSeafowlHTTPContext>[0]
) => {
  return makeSeafowlHTTPContext({
    database: {
      dbname: "default",
    },
    authenticatedCredential: SEAFOWL_SECRET
      ? {
          token: SEAFOWL_SECRET,
          anonymous: false,
        }
      : undefined,
    host: {
      // temporary hacky mess
      dataHost: "127.0.0.1:8080",
      apexDomain: "bogus",
      apiHost: "bogus",
      baseUrls: {
        gql: "bogus",
        sql: "http://127.0.0.1:8080",
        auth: "bogus",
      },
      postgres: {
        host: "127.0.0.1",
        port: 6432,
        ssl: false,
      },
    },
    ...opts, // note: only top level keys are merged
  });
};

export const createRealDataContext = () => {
  return makeSeafowlHTTPContext({
    database: {
      dbname: "default",
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
        sql: "http://127.0.0.1:8080",
        auth: "bogus",
      },
      postgres: {
        host: "127.0.0.1",
        port: 6432,
        ssl: false,
      },
    },
  });
};

// import type { JavaScriptDataType } from "apache-arrow"

const tableFromJSONWithSchema = <
  T extends Record<string, unknown>,
  TM extends dtypes.TypeMap,
  S extends Schema<TM>
>(
  array: T[],
  schema: S
): Table<TM> => {
  const vector = vectorFromArray(array) as Vector<dtypes.Struct<any>>;

  const inferredSchema = new Schema(vector.type.children);
  const givenSchema = schema;
  const mergedSchema = inferredSchema.assign(givenSchema);

  const batch = new RecordBatch(mergedSchema, vector.data[0]);
  return new Table(batch);
};

// TODO: This asserts on the live fields of the seafowl backend, but we still
// need to add the code that parses them to our shape. This is mostly here for
// keeping track of what the actual response looks like so we can mock it accurately.
describe.skipIf(shouldSkipSeafowlTests())(
  "parse fields from live seafowl backend",
  () => {
    const makeLiveDataContext = () => {
      return createDataContext({
        database: {
          dbname: "default",
        },
        host: {
          dataHost: "header-testing.seafowl.cloud",
          apexDomain: "",
          apiHost: "",
          baseUrls: {
            gql: "",
            sql: "https://header-testing.seafowl.cloud",
            auth: "",
          },
          postgres: {
            host: "127.0.0.1",
            port: 6432,
            ssl: false,
          },
        },
      });
    };

    it("simple query, one column", async () => {
      const { client } = makeLiveDataContext();

      const result = await client.execute<any>("SELECT 1");

      const rows = result.response?.rows;

      expect(rows).toMatchInlineSnapshot(`
      [
        {
          "Int64(1)": 1,
        },
      ]
    `);

      const arrowFields = result.response?.fields;

      expect(typeof arrowFields).toEqual("object");

      expect(arrowFields).toMatchInlineSnapshot(`
      {
        "fields": [
          {
            "children": [],
            "name": "Int64(1)",
            "nullable": false,
            "type": {
              "bitWidth": 64,
              "isSigned": true,
              "name": "int",
            },
          },
        ],
        "metadata": {},
      }
    `);

      expect((arrowFields as any)["fields"][0]["name"]).toEqual("Int64(1)");
    });

    it("simple query, two columns", async () => {
      const { client } = makeLiveDataContext();

      const result = await client.execute<any>("SELECT 1, 2");

      const rows = result.response?.rows;

      expect(rows).toMatchInlineSnapshot(`
      [
        {
          "Int64(1)": 1,
          "Int64(2)": 2,
        },
      ]
    `);

      const arrowFields = result.response?.fields;

      expect(typeof arrowFields).toEqual("object");

      expect(arrowFields).toMatchInlineSnapshot(`
      {
        "fields": [
          {
            "children": [],
            "name": "Int64(1)",
            "nullable": false,
            "type": {
              "bitWidth": 64,
              "isSigned": true,
              "name": "int",
            },
          },
          {
            "children": [],
            "name": "Int64(2)",
            "nullable": false,
            "type": {
              "bitWidth": 64,
              "isSigned": true,
              "name": "int",
            },
          },
        ],
        "metadata": {},
      }
    `);

      expect((arrowFields as any)["fields"][0]["name"]).toEqual("Int64(1)");
      expect((arrowFields as any)["fields"][1]["name"]).toEqual("Int64(2)");
    });

    it("nasty query", async () => {
      const { client } = makeLiveDataContext();

      const result = await client.execute<any>(
        `SELECT 1::FLOAT AS \"_ :;.,\/'?!(){}[]@<>=-+*#$&\`|~^%\"`
      );

      const rows = result.response?.rows;

      expect(rows).toMatchInlineSnapshot(`
      [
        {
          "_ :;.,/'?!(){}[]@<>=-+*#$&\`|~^%": 1,
        },
      ]
    `);

      const arrowFields = result.response?.fields;

      expect(typeof arrowFields).toEqual("object");

      expect(arrowFields).toMatchInlineSnapshot(`
      {
        "fields": [
          {
            "children": [],
            "name": "_ :;.,/'?!(){}[]@<>=-+*#$&\`|~^%",
            "nullable": false,
            "type": {
              "name": "floatingpoint",
              "precision": "SINGLE",
            },
          },
        ],
        "metadata": {},
      }
    `);

      expect((arrowFields as any)["fields"][0]["name"]).toEqual(
        "_ :;.,/'?!(){}[]@<>=-+*#$&`|~^%"
      );
    });

    it("one double quote in column name", async () => {
      const { client } = makeLiveDataContext();

      // column name should be literal " (one double quote) (SQL escapes one double quote with two double quotes)
      const result = await client.execute<any>('SELECT 1::FLOAT AS """"');

      const rows = result.response?.rows;

      expect(rows).toMatchInlineSnapshot(`
      [
        {
          "\\"": 1,
        },
      ]
    `);

      const arrowFields = result.response?.fields;

      expect(typeof arrowFields).toEqual("object");

      expect(arrowFields).toMatchInlineSnapshot(`
      {
        "fields": [
          {
            "children": [],
            "name": "\\"",
            "nullable": false,
            "type": {
              "name": "floatingpoint",
              "precision": "SINGLE",
            },
          },
        ],
        "metadata": {},
      }
    `);

      expect((arrowFields as any)["fields"][0]["name"]).toEqual('"');
    });

    it("two double quotes in column name", async () => {
      const { client } = makeLiveDataContext();

      // column name should be literal "" (two double quotes)
      const result = await client.execute<any>('SELECT 1::FLOAT AS """"""');

      const rows = result.response?.rows;

      expect(rows).toMatchInlineSnapshot(`
      [
        {
          "\\"\\"": 1,
        },
      ]
    `);

      const arrowFields = result.response?.fields;

      expect(typeof arrowFields).toEqual("object");

      expect(arrowFields).toMatchInlineSnapshot(`
      {
        "fields": [
          {
            "children": [],
            "name": "\\"\\"",
            "nullable": false,
            "type": {
              "name": "floatingpoint",
              "precision": "SINGLE",
            },
          },
        ],
        "metadata": {},
      }
    `);

      expect((arrowFields as any)["fields"][0]["name"]).toEqual('""');
    });
  }
);

describe("arrow", () => {
  setupMswServerTestHooks();

  const makeMockDataCtx = () =>
    createDataContext({
      strategies: {
        async makeQueryURL() {
          return Promise.resolve("http://localhost/default/q/fingerprint");
        },
        makeFetchOptions() {
          return {
            method: "GET",
            headers: {},
          };
        },
        parseFieldsFromResponse: parseFieldsFromResponseContentTypeHeader,
        parseFieldsFromResponseBodyJSON: skipParsingFieldsFromResponseBodyJSON,
        transformFetchOptions: skipTransformFetchOptions,
      },
    });

  it("parses JSON with no undefined or nulls into arrow table", async (testCtx) => {
    const { mswServer } = testCtx;

    mswServer?.use(
      rest.get("http://localhost/default/q/fingerprint", (_req, res, ctx) => {
        return res(
          ctx.status(200),
          // note: not accurate/required, but put it here to avoid warning from failed json parsing
          ctx.set(
            "Content-Type",

            `application/json; arrow-schema-escaped=${encodeURIComponent(
              JSON.stringify({ blah: "foo=bar; arrow-schema-escaped-inner" })
            )}`
          ),
          ctx.body(
            [...Array(11000)]
              .map(() => ({
                col1: faker.date.past(),
                col2: faker.datatype.number(),
                col3: faker.datatype.string(
                  faker.datatype.number({ max: 100, min: 20 })
                ),
                col4: faker.datatype.number({ precision: 0.01 }),
              }))
              .map((row) => JSON.stringify(row))
              .join("\n")
          )
        );
      })
    );

    const { client } = makeMockDataCtx();

    const result = await client.execute<{
      col1: string;
      col2: number;
      col3: string;
      col4: number;
    }>("SELECT * from something;");

    const rows = result.response?.rows!;

    expect(rows.length).toEqual(11000);

    // const arrowTable = tableFromJSON(rows);

    const arrowTable = tableFromJSONWithSchema(
      rows,
      new Schema([new Field("col1", new dtypes.Utf8())])
    );

    expect(arrowTable.schema.names).toMatchInlineSnapshot(`
      [
        "col1",
        "col2",
        "col3",
        "col4",
      ]
    `);

    expect(arrowTable.schema).toMatchInlineSnapshot(`
      Schema {
        "dictionaries": Map {
          0 => Utf8 {},
          1 => Utf8 {},
        },
        "fields": [
          Field {
            "metadata": Map {},
            "name": "col1",
            "nullable": false,
            "type": Utf8 {},
          },
          Field {
            "metadata": Map {},
            "name": "col2",
            "nullable": true,
            "type": Float64 {
              "precision": 2,
            },
          },
          Field {
            "metadata": Map {},
            "name": "col3",
            "nullable": true,
            "type": Dictionary {
              "dictionary": Utf8 {},
              "id": 1,
              "indices": Int32 {
                "bitWidth": 32,
                "isSigned": true,
              },
              "isOrdered": false,
            },
          },
          Field {
            "metadata": Map {},
            "name": "col4",
            "nullable": true,
            "type": Float64 {
              "precision": 2,
            },
          },
        ],
        "metadata": Map {},
      }
    `);
  });

  it("parses JSON with undefined and nulls into arrow table", async (testCtx) => {
    const { mswServer } = testCtx;

    mswServer?.use(
      rest.get("http://localhost/default/q/fingerprint", (_req, res, ctx) => {
        return res(
          ctx.status(200),
          // note: not accurate/required, but put it here to avoid warning from failed json parsing
          ctx.set(
            "Content-Type",
            `application/json; arrow-schema-escaped=${encodeURIComponent(
              JSON.stringify({ blah: "foo=bar; arrow-schema-escaped-inner" })
            )}`
          ),
          ctx.body(
            [
              { dcol: "2022-10-03T03:18:32.895Z" },
              { col1: "foo", col2: "bar", cnullable: "bizz", copt: 44 },
              { col1: "fizz", col2: "buzz", cnullable: null },
              { col1: "fizz", col2: "buzz", cnullable: "gah", copt: 45 },
              { col1: "fizz", col2: "buzz", cnullable: "gah", copt: 46 },
            ]
              .map((row) => JSON.stringify(row))
              .join("\n")
          )
        );
      })
    );

    const { client } = makeMockDataCtx();

    const result = await client.execute<{
      col1: string;
      col2: string;
      cnullable: string | null;
      copt: string | undefined;
    }>("SELECT * from something;");

    const rows = result.response?.rows!;

    expect(rows.length).toEqual(5);

    const arrowTable = tableFromJSON(rows);

    expect(arrowTable.numCols).toEqual(5);

    expect(arrowTable.numRows).toEqual(5);

    expect(rows[0]).toMatchInlineSnapshot(`
      {
        "dcol": "2022-10-03T03:18:32.895Z",
      }
    `);

    expect(arrowTable.schema).toMatchInlineSnapshot(`
      Schema {
        "dictionaries": Map {
          2 => Utf8 {},
          3 => Utf8 {},
          4 => Utf8 {},
          5 => Utf8 {},
        },
        "fields": [
          Field {
            "metadata": Map {},
            "name": "dcol",
            "nullable": true,
            "type": Dictionary {
              "dictionary": Utf8 {},
              "id": 2,
              "indices": Int32 {
                "bitWidth": 32,
                "isSigned": true,
              },
              "isOrdered": false,
            },
          },
          Field {
            "metadata": Map {},
            "name": "col1",
            "nullable": true,
            "type": Dictionary {
              "dictionary": Utf8 {},
              "id": 3,
              "indices": Int32 {
                "bitWidth": 32,
                "isSigned": true,
              },
              "isOrdered": false,
            },
          },
          Field {
            "metadata": Map {},
            "name": "col2",
            "nullable": true,
            "type": Dictionary {
              "dictionary": Utf8 {},
              "id": 4,
              "indices": Int32 {
                "bitWidth": 32,
                "isSigned": true,
              },
              "isOrdered": false,
            },
          },
          Field {
            "metadata": Map {},
            "name": "cnullable",
            "nullable": true,
            "type": Dictionary {
              "dictionary": Utf8 {},
              "id": 5,
              "indices": Int32 {
                "bitWidth": 32,
                "isSigned": true,
              },
              "isOrdered": false,
            },
          },
          Field {
            "metadata": Map {},
            "name": "copt",
            "nullable": true,
            "type": Float64 {
              "precision": 2,
            },
          },
        ],
        "metadata": Map {},
      }
    `);
  });
});

describe("fields from header", () => {
  setupMswServerTestHooks();

  beforeEach((testCtx) => {
    const { mswServer } = testCtx;

    mswServer?.use(
      rest.get("http://localhost/default/q/fingerprint", (_req, res, ctx) => {
        return res(
          ctx.status(200),
          ctx.set(
            "Content-Type",
            `application/json; arrow-schema-escaped=${encodeURIComponent(
              JSON.stringify({ blah: "foo=bar; arrow-schema-escaped-inner" })
            )}`
          ),
          ctx.body(
            [
              { col1: "foo", col2: "bar", cnullable: "bizz", copt: 44 },
              { col1: "fizz", col2: "buzz", cnullable: null },
              { col1: "fizz", col2: "buzz", cnullable: "gah", copt: 45 },
              { col1: "fizz", col2: "buzz", cnullable: "gah", copt: 46 },
            ]
              .map((row) => JSON.stringify(row))
              .join("\n")
          )
        );
      }),
      rest.get(
        "http://localhost/default/q/invalid-header",
        (_req, res, ctx) => {
          return res(
            ctx.status(200),
            // Return a content-type with invalid JSON
            ctx.set(
              "Content-Type",
              `application/json; arrow-schema-escaped=${encodeURIComponent(
                '{"blah": "extra comma",}'
              )}`
            ),
            ctx.body(
              [{ col1: "1" }].map((row) => JSON.stringify(row)).join("\n")
            )
          );
        }
      )
    );
  });

  it("infers fields from content-type header", async () => {
    const ctx = createDataContext({
      strategies: {
        async makeQueryURL() {
          return Promise.resolve("http://localhost/default/q/fingerprint");
        },
        makeFetchOptions() {
          return {
            method: "GET",
            headers: {},
          };
        },
        parseFieldsFromResponse: parseFieldsFromResponseContentTypeHeader,
        parseFieldsFromResponseBodyJSON: skipParsingFieldsFromResponseBodyJSON,
        transformFetchOptions: skipTransformFetchOptions,
      },
    });

    const resp = await ctx.client.execute<{ col1: string; col2: string }>(
      "SELECT * from something;"
    );

    expect(resp.response?.fields).toMatchInlineSnapshot(`
      {
        "blah": "foo=bar; arrow-schema-escaped-inner",
      }
    `);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("warns on failed parse JSON from content-type header, returns undefined for fields", async () => {
    const ctx = createDataContext({
      strategies: {
        async makeQueryURL() {
          return Promise.resolve("http://localhost/default/q/invalid-header");
        },
        makeFetchOptions() {
          return {
            method: "GET",
            headers: {},
          };
        },
        parseFieldsFromResponse: parseFieldsFromResponseContentTypeHeader,
        parseFieldsFromResponseBodyJSON: skipParsingFieldsFromResponseBodyJSON,
        transformFetchOptions: skipTransformFetchOptions,
      },
    });

    const mockedWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const resp = await ctx.client.execute<{ col1: string; col2: string }>(
      "SELECT * from something;"
    );

    expect(mockedWarn).toHaveBeenLastCalledWith(
      "Failed to parse fields from Response Content-Type header"
    );

    // TODO: (?) This is not type-safe/consistent with expected shape of fields,
    // and perhaps would be better fo fallback to field inferrence, but should happen rarely
    expect(resp.response?.fields).toBeUndefined();
  });
});

describe("field inferrence", () => {
  setupMswServerTestHooks();

  beforeEach((testCtx) => {
    const { mswServer } = testCtx;

    mswServer?.use(
      rest.get("http://localhost/default/q/fingerprint", (_req, res, ctx) => {
        return res(
          ctx.status(200),
          // note: not accurate/required, but put it here to avoid warning from failed json parsing
          ctx.set(
            "Content-Type",
            `application/json; arrow-schema-escaped=${encodeURIComponent(
              JSON.stringify({ blah: "foo=bar; arrow-schema-escaped-inner" })
            )}`
          ),
          ctx.body(
            [
              { col1: "foo", col2: "bar", cnullable: "bizz", copt: 44 },
              { col1: "fizz", col2: "buzz", cnullable: null },
              { col1: "fizz", col2: "buzz", cnullable: "gah", copt: 45 },
              { col1: "fizz", col2: "buzz", cnullable: "gah", copt: 46 },
            ]
              .map((row) => JSON.stringify(row))
              .join("\n")
          )
        );
      })
    );
  });

  // TODO: We're probably getting rid of this, but might keep it as a fallback
  // if parsing from header fails? So keep it here for now but skip its test
  it.skip("infers fields", async () => {
    const ctx = createDataContext({
      strategies: {
        async makeQueryURL() {
          return Promise.resolve("http://localhost/default/q/fingerprint");
        },
        makeFetchOptions() {
          return {
            method: "GET",
            headers: {},
          };
        },
        parseFieldsFromResponse: parseFieldsFromResponseContentTypeHeader,
        parseFieldsFromResponseBodyJSON: skipParsingFieldsFromResponseBodyJSON,
        transformFetchOptions: skipTransformFetchOptions,
      },
    });

    const resp = await ctx.client.execute<{ col1: string; col2: string }>(
      "SELECT * from something;"
    );

    expect(resp).toMatchInlineSnapshot(`
      {
        "error": null,
        "response": {
          "fields": [
            {
              "columnID": "col1",
              "format": "string",
              "formattedType": "string (JSON)",
              "name": "col1",
            },
            {
              "columnID": "col2",
              "format": "string",
              "formattedType": "string (JSON)",
              "name": "col2",
            },
            {
              "columnID": "cnullable",
              "format": "string | null",
              "formattedType": "string | null",
              "name": "cnullable",
            },
            {
              "columnID": "copt",
              "format": "number | undefined",
              "formattedType": "number | undefined",
              "name": "copt",
            },
          ],
          "readable": [Function],
          "rows": [
            {
              "cnullable": "bizz",
              "col1": "foo",
              "col2": "bar",
              "copt": 44,
            },
            {
              "cnullable": null,
              "col1": "fizz",
              "col2": "buzz",
            },
            {
              "cnullable": "gah",
              "col1": "fizz",
              "col2": "buzz",
              "copt": 45,
            },
            {
              "cnullable": "gah",
              "col1": "fizz",
              "col2": "buzz",
              "copt": 46,
            },
          ],
          "success": true,
        },
      }
    `);
  });
});

describe("makeSeafowlHTTPContext", () => {
  it("initializes as expected", () => {
    const ctx = createDataContext();

    expect(ctx.client).toBeTruthy();
    expect(ctx.db).toBeTruthy();

    expect(typeof ctx.db["authenticatedCredential"] === "undefined").toEqual(
      expectAnonymous
    );

    // NOTE: seafowlClient is expected to be undefined because we don't set it
    // in the constructor (since it depends on the instantiated class). Instead
    // we set it via a builder like withOptions (in other words, the instance
    // created via `new DbSeafowl()` cannot control a seafowlClient, and must create
    // a new instance from one of its builder methods to use a seafowlClient)
    //    (this is not necessarily a desirable state of affairs)
    expect({
      ...ctx,
      db: (({
        // @ts-expect-error Protected member, but it gets serialized and we want to remove it
        authenticatedCredential: _removeHardToSnapshotAuthenticatedCredential,
        ...dbCtx
      }: typeof ctx.db) => dbCtx)(ctx.db),
    }).toMatchInlineSnapshot(`
      {
        "client": SqlHTTPClient {
          "bodyMode": "jsonl",
          "credential": {
            "anonymous": ${expectAnonymous},
            "token": "${expectToken}",
          },
          "database": {
            "dbname": "default",
          },
          "host": {
            "apexDomain": "bogus",
            "apiHost": "bogus",
            "baseUrls": {
              "auth": "bogus",
              "gql": "bogus",
              "sql": "http://127.0.0.1:8080",
            },
            "dataHost": "127.0.0.1:8080",
            "postgres": {
              "host": "127.0.0.1",
              "port": 6432,
              "ssl": false,
            },
          },
          "strategies": {
            "makeFetchOptions": [Function],
            "makeQueryURL": [Function],
            "parseFieldsFromResponse": [Function],
            "parseFieldsFromResponseBodyJSON": [Function],
            "transformFetchOptions": [Function],
          },
        },
        "db": {
          "database": {
            "dbname": "default",
          },
          "host": {
            "apexDomain": "bogus",
            "apiHost": "bogus",
            "baseUrls": {
              "auth": "bogus",
              "gql": "bogus",
              "sql": "http://127.0.0.1:8080",
            },
            "dataHost": "127.0.0.1:8080",
            "postgres": {
              "host": "127.0.0.1",
              "port": 6432,
              "ssl": false,
            },
          },
          "opts": {
            "authenticatedCredential": ${
              expectAnonymous
                ? "undefined"
                : `{
              "anonymous": ${expectAnonymous},
              "token": "${expectToken}",
            }`
            },
            "database": {
              "dbname": "default",
            },
            "host": {
              "apexDomain": "bogus",
              "apiHost": "bogus",
              "baseUrls": {
                "auth": "bogus",
                "gql": "bogus",
                "sql": "http://127.0.0.1:8080",
              },
              "dataHost": "127.0.0.1:8080",
              "postgres": {
                "host": "127.0.0.1",
                "port": 6432,
                "ssl": false,
              },
            },
            "plugins": [
              SeafowlImportFilePlugin {
                "__name": "csv",
                "opts": {
                  "seafowlClient": undefined,
                },
                "seafowlClient": undefined,
              },
            ],
          },
          "plugins": PluginRegistry {
            "hostContext": {},
            "plugins": [
              SeafowlImportFilePlugin {
                "__name": "csv",
                "opts": {
                  "seafowlClient": undefined,
                },
                "seafowlClient": undefined,
              },
            ],
          },
        },
      }
    `);
  });
});

// NOTE: kind of unsafe/misleading. We're only testing the strategy functions here,
// since e.g. SqlHttpClient.makeQueryURL is private, and we haven't yet bothered to
// mock the Seafowl HTTP API. So we're assuming that SqlClientHttpClient.makeQueryURL
// will pass parameters to the strategy function in the same way as we are doing here
describe("makeQueryURL", () => {
  const makeTestContext = ({ host, dbname }: { host: Host; dbname: string }) =>
    makeSeafowlHTTPContext({
      database: {
        dbname,
      },
      authenticatedCredential: undefined,
      host,
    });

  const hostFromUrl = (dataHost: string) => ({
    dataHost: dataHost,
    apexDomain: "bogus",
    apiHost: "bogus",
    baseUrls: {
      gql: "bogus",
      sql: "http://127.0.0.1:8080",
      auth: "bogus",
    },
    postgres: {
      host: "127.0.0.1",
      port: 6432,
      ssl: false,
    },
  });

  const makeMockedMakeQueryUrl = ({
    dataHost,
    dbname,
  }: {
    dataHost: string;
    dbname: string;
  }) => {
    const opts = { host: hostFromUrl(dataHost), dbname: dbname };

    const {
      db: {
        httpClientOptions: { strategies },
      },
    } = makeTestContext(opts);

    return {
      opts,
      makeQueryUrl: (query: string) => {
        return strategies?.makeQueryURL({
          host: opts.host,
          database: { dbname: opts.dbname },
          query: query,
        });
      },
    };
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("constructs GET query URL for SELECT", async () => {
    const { makeQueryUrl } = makeMockedMakeQueryUrl({
      dataHost: "127.0.0.1:8080",
      dbname: "blahblah",
    });

    expect(await makeQueryUrl("SELECT 1")).toMatchInlineSnapshot(
      '"http://127.0.0.1:8080/blahblah/q/e004ebd5b5532a4b85984a62f8ad48a81aa3460c1ca07701f386135d72cdecf5.csv"'
    );
  });

  it("assumes GET if no DDL but warns if no SELECT", async () => {
    const { makeQueryUrl } = makeMockedMakeQueryUrl({
      dataHost: "127.0.0.1:8080",
      dbname: "blahblah",
    });

    const mockedWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(await makeQueryUrl("-- Just a comment")).toMatchInlineSnapshot(
      '"http://127.0.0.1:8080/blahblah/q/86661ce809b75e52fe37ba823a305238ce392fb793eaa92d2f86cd74bddb2a50.csv"'
    );

    expect(mockedWarn).toHaveBeenLastCalledWith(
      "No SELECT in query, but assuming GET:",
      "-- Just a comment"
    );
  });

  // NOTE: We have a (very) hacky `guessMethodForQuery` that presumes GET for most queries
  // and specifically looks for DDL statements for POST queries. See db-seafowl.ts
  it("constructs POST query URL for DDL commands", async () => {
    const { makeQueryUrl } = makeMockedMakeQueryUrl({
      dataHost: "127.0.0.1:8080",
      dbname: "blahblah",
    });

    // NOTE: We assume it's a POST query because there is no hash in the URL
    expect(await makeQueryUrl("INSERT INTO blahblah")).toMatchInlineSnapshot(
      '"http://127.0.0.1:8080/blahblah/q"'
    );
    expect(await makeQueryUrl("UPDATE something")).toMatchInlineSnapshot(
      '"http://127.0.0.1:8080/blahblah/q"'
    );
    expect(await makeQueryUrl("DELETE xxx")).toMatchInlineSnapshot(
      '"http://127.0.0.1:8080/blahblah/q"'
    );
    expect(await makeQueryUrl("delete xxx")).toMatchInlineSnapshot(
      '"http://127.0.0.1:8080/blahblah/q"'
    );
    expect(
      await makeQueryUrl(`DELETE
        xxx`)
    ).toMatchInlineSnapshot('"http://127.0.0.1:8080/blahblah/q"');
    expect(await makeQueryUrl("ALTER a_table")).toMatchInlineSnapshot(
      '"http://127.0.0.1:8080/blahblah/q"'
    );
    expect(await makeQueryUrl("VACUUM")).toMatchInlineSnapshot(
      '"http://127.0.0.1:8080/blahblah/q"'
    );
    expect(await makeQueryUrl("CREATE")).toMatchInlineSnapshot(
      '"http://127.0.0.1:8080/blahblah/q"'
    );
    expect(await makeQueryUrl("Drop table blah")).toMatchInlineSnapshot(
      '"http://127.0.0.1:8080/blahblah/q"'
    );
  });
});

// NOTE: It's up to the backend to support rowMode array/object mode
// and at the moment seafowl is only object mode
describe.skipIf(shouldSkipSeafowlTests())("can query local seafowl", () => {
  it("select 1, 2 in (default) object mode in (default) jsonl body mode", async () => {
    const { client } = createDataContext();

    const res = await client.execute<[number, number]>("select 1, 2;", {
      rowMode: "object",
    });

    expect(res.response).toMatchInlineSnapshot(`
      {
        "readable": [Function],
        "rows": [
          {
            "Int64(1)": 1,
            "Int64(2)": 2,
          },
        ],
        "success": true,
      }
    `);
  });
});
