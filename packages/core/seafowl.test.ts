import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { makeSeafowlHTTPContext } from "./seafowl";
import { setupMswServerTestHooks } from "@madatdata/test-helpers/msw-server-hooks";
import { setupMemo } from "@madatdata/test-helpers/setup-memo";
import { shouldSkipSeafowlTests } from "@madatdata/test-helpers/env-config";
import type { Host } from "@madatdata/base-client";
import {
  parseArrowFieldsFromResponseContentTypeHeader,
  skipParsingFieldsFromResponseBodyJSON,
  skipTransformFetchOptions,
} from "@madatdata/client-http";
import { rest } from "msw";

import type { IsomorphicRequest } from "@mswjs/interceptors";

import {
  SEAFOWL_SECRET,
  createDataContext,
} from "./test-helpers/seafowl-test-helpers";

// Depending on whether SEAFOWL_SECRET is defined (might not be in CI), we expect
// serialized credentials to include different values
const expectAnonymous = !SEAFOWL_SECRET;
const expectToken = SEAFOWL_SECRET ?? "anonymous-token";

// import type { JavaScriptDataType } from "apache-arrow"

// TODO: This asserts on the live fields of the seafowl backend, but we still
// need to add the code that parses them to our shape. This is mostly here for
// keeping track of what the actual response looks like so we can mock it accurately.
// const shouldSkipSeafowl = true;

describe("interface", () => {
  it("can be created with instance URL string", () => {
    const simpleContext = makeSeafowlHTTPContext("https://demo.seafowl.cloud");

    expect(
      // @ts-expect-error Abuse private property "host" to skip serializing a giant snapshot
      simpleContext.client.host.baseUrls.sql
    ).toEqual("https://demo.seafowl.cloud");

    expect(
      // @ts-expect-error Abuse private property "host" to skip serializing a giant snapshot
      simpleContext.client.host.dataHost
    ).toEqual("demo.seafowl.cloud");
  });

  it("can be created with instance URL string, and simplified opts (dbname)", () => {
    const simpleContext = makeSeafowlHTTPContext("https://demo.seafowl.cloud", {
      dbname: "alternative",
    });

    expect(
      // @ts-expect-error Abuse private property "database" to skip serializing a giant snapshot
      simpleContext.client.database.dbname
    ).toEqual("alternative");

    expect(
      // @ts-expect-error Abuse private property "host" to skip serializing a giant snapshot
      simpleContext.client.host.baseUrls.sql
    ).toEqual("https://demo.seafowl.cloud");

    expect(
      // @ts-expect-error Abuse private property "host" to skip serializing a giant snapshot
      simpleContext.client.host.dataHost
    ).toEqual("demo.seafowl.cloud");
  });
});

describe("abort signal", () => {
  it("can take it as an option to execute", async () => {
    const ctx = createDataContext({
      strategies: {
        async makeQueryURL() {
          return Promise.resolve(
            "http://localhost/default/q/test-abort-signal"
          );
        },
        makeFetchOptions() {
          // HACK: return null to indicate deference to makeFetchOptions provided by DB
          return null;
        },
        parseFieldsFromResponse: parseArrowFieldsFromResponseContentTypeHeader,
        parseFieldsFromResponseBodyJSON: skipParsingFieldsFromResponseBodyJSON,
        transformFetchOptions: skipTransformFetchOptions,
      },
    });

    const abortController = new AbortController();
    const abortSignal = abortController.signal;

    abortController.abort();

    const abortedResp = await ctx.client.execute<{ "Int64(1)": number }>(
      "SELECT 1",
      { abortSignal: abortSignal }
    );

    // Error is caught and passed to the error property with .name=AbortError
    expect(abortedResp).toMatchInlineSnapshot(`
      {
        "error": {
          "name": "AbortError",
          "success": false,
          "type": "network",
        },
        "response": null,
      }
    `);
  });
});

describe.skipIf(shouldSkipSeafowlTests())(
  "parse fields from live seafowl backend",
  () => {
    const makeLiveDataContext = () => {
      return createDataContext({
        secret: SEAFOWL_SECRET,
        database: {
          dbname: "default",
        },
        host: {
          dataHost: "censored",
          apexDomain: "",
          apiHost: "",
          baseUrls: {
            gql: "",
            sql: "http://censored",
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

      const fields = result.response?.fields;

      expect(Array.isArray(fields)).toBe(true);

      expect(fields).toMatchInlineSnapshot(`
        [
          {
            "columnID": 0,
            "dataTypeID": -1,
            "dataTypeModifier": -1,
            "dataTypeSize": -1,
            "format": "BIGINT NOT NULL",
            "formattedType": "BIGINT NOT NULL",
            "name": "Int64(1)",
            "tableID": -1,
          },
        ]
      `);

      expect(fields![0]["name"]).toEqual("Int64(1)");
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

      const fields = result.response?.fields;

      expect(Array.isArray(fields)).toBe(true);

      expect(fields).toMatchInlineSnapshot(`
        [
          {
            "columnID": 0,
            "dataTypeID": -1,
            "dataTypeModifier": -1,
            "dataTypeSize": -1,
            "format": "BIGINT NOT NULL",
            "formattedType": "BIGINT NOT NULL",
            "name": "Int64(1)",
            "tableID": -1,
          },
          {
            "columnID": 1,
            "dataTypeID": -1,
            "dataTypeModifier": -1,
            "dataTypeSize": -1,
            "format": "BIGINT NOT NULL",
            "formattedType": "BIGINT NOT NULL",
            "name": "Int64(2)",
            "tableID": -1,
          },
        ]
      `);

      expect(fields![0]["name"]).toEqual("Int64(1)");
      expect(fields![1]["name"]).toEqual("Int64(2)");
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

      const fields = result.response?.fields;

      expect(Array.isArray(fields)).toBe(true);

      expect(fields).toMatchInlineSnapshot(`
        [
          {
            "columnID": 0,
            "dataTypeID": -1,
            "dataTypeModifier": -1,
            "dataTypeSize": -1,
            "format": "FLOAT NOT NULL",
            "formattedType": "FLOAT NOT NULL",
            "name": "_ :;.,/'?!(){}[]@<>=-+*#$&\`|~^%",
            "tableID": -1,
          },
        ]
      `);

      expect(fields![0]["name"]).toEqual("_ :;.,/'?!(){}[]@<>=-+*#$&`|~^%");
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

      const fields = result.response?.fields;

      expect(Array.isArray(fields)).toBe(true);

      expect(fields).toMatchInlineSnapshot(`
        [
          {
            "columnID": 0,
            "dataTypeID": -1,
            "dataTypeModifier": -1,
            "dataTypeSize": -1,
            "format": "FLOAT NOT NULL",
            "formattedType": "FLOAT NOT NULL",
            "name": "\\"",
            "tableID": -1,
          },
        ]
      `);

      expect(fields![0]["name"]).toEqual('"');
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

      const fields = result.response?.fields;

      expect(Array.isArray(fields)).toBe(true);

      expect(fields).toMatchInlineSnapshot(`
        [
          {
            "columnID": 0,
            "dataTypeID": -1,
            "dataTypeModifier": -1,
            "dataTypeSize": -1,
            "format": "FLOAT NOT NULL",
            "formattedType": "FLOAT NOT NULL",
            "name": "\\"\\"",
            "tableID": -1,
          },
        ]
      `);

      expect(fields![0]["name"]).toEqual('""');
    });

    const allTypesQuery = `WITH t (
      c_int16_smallint,
      c_int32_int,
      c_int64_bigint,
      c_utf8_char,
      c_utf8_varchar,
      c_utf8_text,
      c_float32_float,
      c_float32_real,
      c_float64_double,
      c_boolean_boolean,
      c_date32_date,
      c_timestamp_microseconds_timestamp

    ) AS (
      VALUES(
        /* Int16 / SMALLINT */
        42::SMALLINT,
        /* Int32 / INT */
        99::INT,
        /* Int64 / BIGINT */
        420420::BIGINT,
        /* Utf8 / CHAR */
        'x'::CHAR,
        /* Utf8 / VARCHAR */
        'abcdefghijklmnopqrstuvwxyz'::VARCHAR,
        /* Utf8 / TEXT */
        'zyxwvutsrqponmlkjihgfedcba'::TEXT,
        /* Float32 / FLOAT */
        4.4::FLOAT,
        /* Float32 / REAL */
        2.0::REAL,
        /* Float64 / DOUBLE */
        69.420420::DOUBLE,
        /* Boolean / BOOLEAN */
        't'::BOOLEAN,
        /* Date32 / DATE */
        '1997-06-17'::DATE,
        /* Timestamp(us) / TIMESTAMP */
        '2018-11-11T11:11:11.111111111'::TIMESTAMP
      )
    ) SELECT * FROM t;`;

    it("all types", async () => {
      const { client } = makeLiveDataContext();

      // column name format: c_{arrow type}_{sql type}
      const result = await client.execute<any>(allTypesQuery);

      const rows = result.response?.rows;

      expect(rows).toMatchInlineSnapshot(`
        [
          {
            "c_boolean_boolean": true,
            "c_date32_date": "1997-06-17",
            "c_float32_float": 4.4,
            "c_float32_real": 2,
            "c_float64_double": 69.42042,
            "c_int16_smallint": 42,
            "c_int32_int": 99,
            "c_int64_bigint": 420420,
            "c_timestamp_microseconds_timestamp": "2018-11-11T11:11:11.111111111",
            "c_utf8_char": "x",
            "c_utf8_text": "zyxwvutsrqponmlkjihgfedcba",
            "c_utf8_varchar": "abcdefghijklmnopqrstuvwxyz",
          },
        ]
      `);

      const fields = result.response?.fields;

      expect(Array.isArray(fields)).toEqual(true);

      expect(fields).toMatchInlineSnapshot(`
        [
          {
            "columnID": 0,
            "dataTypeID": -1,
            "dataTypeModifier": -1,
            "dataTypeSize": -1,
            "format": "SMALLINT",
            "formattedType": "SMALLINT",
            "name": "c_int16_smallint",
            "tableID": -1,
          },
          {
            "columnID": 1,
            "dataTypeID": -1,
            "dataTypeModifier": -1,
            "dataTypeSize": -1,
            "format": "INT",
            "formattedType": "INT",
            "name": "c_int32_int",
            "tableID": -1,
          },
          {
            "columnID": 2,
            "dataTypeID": -1,
            "dataTypeModifier": -1,
            "dataTypeSize": -1,
            "format": "BIGINT",
            "formattedType": "BIGINT",
            "name": "c_int64_bigint",
            "tableID": -1,
          },
          {
            "columnID": 3,
            "dataTypeID": -1,
            "dataTypeModifier": -1,
            "dataTypeSize": -1,
            "format": "VARCHAR",
            "formattedType": "VARCHAR",
            "name": "c_utf8_char",
            "tableID": -1,
          },
          {
            "columnID": 4,
            "dataTypeID": -1,
            "dataTypeModifier": -1,
            "dataTypeSize": -1,
            "format": "VARCHAR",
            "formattedType": "VARCHAR",
            "name": "c_utf8_varchar",
            "tableID": -1,
          },
          {
            "columnID": 5,
            "dataTypeID": -1,
            "dataTypeModifier": -1,
            "dataTypeSize": -1,
            "format": "VARCHAR",
            "formattedType": "VARCHAR",
            "name": "c_utf8_text",
            "tableID": -1,
          },
          {
            "columnID": 6,
            "dataTypeID": -1,
            "dataTypeModifier": -1,
            "dataTypeSize": -1,
            "format": "FLOAT",
            "formattedType": "FLOAT",
            "name": "c_float32_float",
            "tableID": -1,
          },
          {
            "columnID": 7,
            "dataTypeID": -1,
            "dataTypeModifier": -1,
            "dataTypeSize": -1,
            "format": "FLOAT",
            "formattedType": "FLOAT",
            "name": "c_float32_real",
            "tableID": -1,
          },
          {
            "columnID": 8,
            "dataTypeID": -1,
            "dataTypeModifier": -1,
            "dataTypeSize": -1,
            "format": "DOUBLE",
            "formattedType": "DOUBLE",
            "name": "c_float64_double",
            "tableID": -1,
          },
          {
            "columnID": 9,
            "dataTypeID": -1,
            "dataTypeModifier": -1,
            "dataTypeSize": -1,
            "format": "BOOLEAN",
            "formattedType": "BOOLEAN",
            "name": "c_boolean_boolean",
            "tableID": -1,
          },
          {
            "columnID": 10,
            "dataTypeID": -1,
            "dataTypeModifier": -1,
            "dataTypeSize": -1,
            "format": "DATE",
            "formattedType": "DATE",
            "name": "c_date32_date",
            "tableID": -1,
          },
          {
            "columnID": 11,
            "dataTypeID": -1,
            "dataTypeModifier": -1,
            "dataTypeSize": -1,
            "format": "TIMESTAMP",
            "formattedType": "TIMESTAMP",
            "name": "c_timestamp_microseconds_timestamp",
            "tableID": -1,
          },
        ]
      `);
    });
  }
);

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
            `application/json; arrow-schema=${encodeURIComponent(
              JSON.stringify({
                blah: "foo=bar; ; arrow-schema=inner-do-not-replace",
              })
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
              `application/json; arrow-schema=${encodeURIComponent(
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
        parseFieldsFromResponse: parseArrowFieldsFromResponseContentTypeHeader,
        parseFieldsFromResponseBodyJSON: skipParsingFieldsFromResponseBodyJSON,
        transformFetchOptions: skipTransformFetchOptions,
      },
    });

    const resp = await ctx.client.execute<{ col1: string; col2: string }>(
      "SELECT * from something;"
    );

    expect(resp.response?.fields).toMatchInlineSnapshot(`
      {
        "blah": "foo=bar; ; arrow-schema=inner-do-not-replace",
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
        parseFieldsFromResponse: parseArrowFieldsFromResponseContentTypeHeader,
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
            `application/json; arrow-schema=${encodeURIComponent(
              JSON.stringify({
                blah: "foo=bar; ; arrow-schema=inner-do-not-replace",
              })
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
        parseFieldsFromResponse: parseArrowFieldsFromResponseContentTypeHeader,
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
    const ctx = createDataContext({ secret: SEAFOWL_SECRET });

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

describe("query fingerprinting and sending", () => {
  setupMswServerTestHooks();
  setupMemo();

  beforeEach((testCtx) => {
    const { mswServer, useTestMemo } = testCtx;

    const reqMemo = useTestMemo!<string, IsomorphicRequest>();

    mswServer?.use(
      rest.get("http://localhost/default/q/fingerprint", (req, res, ctx) => {
        reqMemo.set(testCtx.meta.id, req);

        return res(
          ctx.status(200),
          // note: not accurate/required, but put it here to avoid warning from failed json parsing
          ctx.set(
            "Content-Type",
            `application/json; arrow-schema=${encodeURIComponent(
              JSON.stringify({
                blah: "foo=bar; ; arrow-schema=inner-do-not-replace",
              })
            )}`
          ),
          ctx.body(
            [] // Note: response doesn't matter in this test
              .map((row) => JSON.stringify(row))
              .join("\n")
          )
        );
      })
    );
  });

  it("urlencodes query", async ({ useTestMemo, meta }) => {
    const ctx = createDataContext({
      strategies: {
        async makeQueryURL() {
          return Promise.resolve("http://localhost/default/q/fingerprint");
        },
        makeFetchOptions() {
          // HACK: return null to indicate deference to makeFetchOptions provided by DB
          return null;
        },
        parseFieldsFromResponse: parseArrowFieldsFromResponseContentTypeHeader,
        parseFieldsFromResponseBodyJSON: skipParsingFieldsFromResponseBodyJSON,
        transformFetchOptions: skipTransformFetchOptions,
      },
    });

    const resp = await ctx.client.execute<any>("SELECT * from something;");

    expect(resp).toMatchInlineSnapshot(`
      {
        "error": null,
        "response": {
          "fields": {
            "blah": "foo=bar; ; arrow-schema=inner-do-not-replace",
          },
          "readable": [Function],
          "rows": [],
          "success": true,
        },
      }
    `);

    const reqMemo = useTestMemo!().get(meta.id) as IsomorphicRequest;

    expect(reqMemo["headers"]).toMatchInlineSnapshot(`
      HeadersPolyfill {
        Symbol(normalizedHeaders): {
          "content-type": "application/json",
          "x-seafowl-query": "SELECT%20*%20from%20something%3B",
        },
        Symbol(rawHeaderNames): Map {
          "content-type" => "content-type",
          "x-seafowl-query" => "x-seafowl-query",
        },
      }
    `);

    expect(reqMemo["headers"].get("x-seafowl-query")).toEqual(
      "SELECT%20*%20from%20something%3B"
    );
  });
});

// NOTE: It's up to the backend to support rowMode array/object mode
// and at the moment seafowl is only object mode
describe.skipIf(shouldSkipSeafowlTests())("can query local seafowl", () => {
  it("select 1, 2 in (default) object mode in (default) jsonl body mode", async () => {
    const { client } = createDataContext({ secret: SEAFOWL_SECRET });

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
