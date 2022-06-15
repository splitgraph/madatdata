import { describe, it, expect } from "vitest";
import { makeClient } from "./client";
import { setupServer } from "msw/node";
import { setupMswServerTestHooks } from "@madatdata/test-helpers/msw-server-hooks";

describe("makeClient creates a client which", () => {
  const mswServer = setupServer();
  setupMswServerTestHooks(mswServer);

  it("receives SELECT 1 with expected metadata shape", async () => {
    const client = makeClient({
      credential: null,
    });

    const result = await client.execute<{ "?column?": number }>("SELECT 1;");

    expect(result.response?.rows[0]["?column?"]).toEqual(1);

    expect(
      (() => {
        delete result.response?.["executionTime"];
        delete result.response?.["executionTimeHighRes"];
        return result;
      })()
    ).toMatchInlineSnapshot(`
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

  it("receives INT8 column parsed as an integer by the server", async () => {
    const client = makeClient({
      credential: null,
    });

    const result = await client.execute<{ count: number }>("SELECT count(1);");

    expect(result.response?.rows[0]["count"]).toEqual(1);
  });
});
