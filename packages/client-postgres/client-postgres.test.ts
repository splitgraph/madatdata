import { describe, it, expect } from "vitest";
import { makeClient } from "./client-postgres";

// TODO: We're using the real DDN atm, which requires these env vars to exist,
// and also we don't yet have any method for loading credentials
const credential = {
  // @ts-expect-error https://stackoverflow.com/a/70711231
  apiKey: import.meta.env.VITE_TEST_DDN_API_KEY,
  // @ts-expect-error https://stackoverflow.com/a/70711231
  apiSecret: import.meta.env.VITE_TEST_DDN_API_SECRET,
};

const hasCredential = !!credential.apiKey && !!credential.apiSecret;

describe.skipIf(!hasCredential)("makeClient creates a pg client which", () => {
  const client = makeClient({
    credential,
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
          "rows": Result [
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
          "rows": Result [
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
});
