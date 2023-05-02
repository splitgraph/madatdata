import { describe, it, expect, beforeEach } from "vitest";
import { makeClient } from "./client-postgres";

const credential = {
  // @ts-expect-error https://stackoverflow.com/a/70711231
  apiKey: import.meta.env.VITE_TEST_DDN_API_KEY,
  // @ts-expect-error https://stackoverflow.com/a/70711231
  apiSecret: import.meta.env.VITE_TEST_DDN_API_SECRET,
};

const hasCredential = !!credential.apiKey && !!credential.apiSecret;

describe.skipIf(!hasCredential)("makeClient creates a pg client which", () => {
  let client: ReturnType<typeof makeClient>;

  beforeEach(() => {
    client = makeClient({
      credential,
    });
  });

  it("selects 1 from ddn during integration testing", async () => {
    const result = await client.execute<{ "?column?": number }>("SELECT 1;");

    expect(result.response).toBeTruthy();
    expect(Array.from(result.response!.rows).length).toEqual(1);
    expect(Array.from(result.response!.rows)[0]["?column?"]).toEqual(1);

    expect(result).toMatchInlineSnapshot(`
      {
        "error": null,
        "response": {
          "fields": [],
          "readable": [Function],
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

  it("selects complex types, parses some but missing extensions", async () => {
    const client = makeClient({
      credential,
    });

    const result = await client.execute<{ "?column?": number }>(`
      select * from "mildbyte/multiple_types".multiple_types;
    `);
    expect(result).toMatchInlineSnapshot(`
      {
        "error": null,
        "response": {
          "fields": [],
          "readable": [Function],
          "rows": [
            {
              "array_2d_col": [
                [
                  "breakfast",
                  "consulting",
                ],
                [
                  "meeting",
                  "lunch",
                ],
              ],
              "array_col": [
                1,
                2,
                3,
              ],
              "byte_col": {
                "data": [
                  222,
                  173,
                  190,
                  239,
                ],
                "type": "Buffer",
              },
              "cidr_col": "192.168.100.128/25",
              "geom_col": "010300000001000000040000000000000000C052400000000000003D4000000000004053400000000000003D4000000000004053400000000000003D400000000000C052400000000000003D40",
              "id": 1,
              "json_col": {
                "foo": [
                  true,
                  "bar",
                ],
                "tags": {
                  "a": 1,
                  "b": null,
                },
              },
              "macaddr_col": "08:00:2b:01:02:03",
            },
          ],
          "success": true,
        },
      }
    `);
  });

  // TODO: Throw runtime error if no rowMode: array but result has dupe columns
  // NOTE: This is avoidable with rowMode: array and typechecking
  it("can select duplicate column names in object mode, but it's wrong", async () => {
    const client = makeClient({
      credential,
    });

    const result = await client.execute<{ "?column?": number }>(`
      select 1,2,3,4;
    `);

    // Note how the result only includes an object with the last column value,
    // because all columns have the same key name of ?column?
    expect(result).toMatchInlineSnapshot(`
      {
        "error": null,
        "response": {
          "fields": [],
          "readable": [Function],
          "rows": [
            {
              "?column?": 4,
            },
          ],
          "success": true,
        },
      }
    `);
  });

  it("can select rows with duplicate column names in array mode", async () => {
    const client = makeClient({
      credential,
    });

    const result = await client.execute<[number, number, number, number]>(
      `
      select 1 as one, 2 as two, 3, 4;
    `,
      { rowMode: "array" }
    );

    expect(result).toMatchInlineSnapshot(`
      {
        "error": null,
        "response": {
          "fields": [],
          "readable": [Function],
          "rows": [
            [
              1,
              2,
              3,
              4,
            ],
          ],
          "success": true,
        },
      }
    `);

    const r2 = await client.execute<[number, number, number]>(
      `
      select 1, 2, 3;
    `,
      { rowMode: "array" }
    );

    expect(r2.response?.rows[0][0]).toEqual(1);
    expect(r2.response?.rows[0][1]).toEqual(2);
    expect(r2.response?.rows[0][2]).toEqual(3);

    expect(
      // @ts-expect-error index 3 is out of bounds of provided 3-tuple
      r2.response?.rows[0][3]
    ).toBeUndefined();

    expect(r2.response).toMatchInlineSnapshot(`
      {
        "fields": [],
        "readable": [Function],
        "rows": [
          [
            1,
            2,
            3,
          ],
        ],
        "success": true,
      }
    `);
  });
});

// NOTE: .skip() because this code is intended for typechecking, not running
describe.skip("type checking produces expected errors in", async () => {
  it("client-postgres.execute function overloading", async () => {
    const client = makeClient({
      credential,
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
    return { badObjectType, badArrayType, badArrayTypeNoOptions };
  });
});
