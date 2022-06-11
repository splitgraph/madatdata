import { describe, it, expect } from "vitest";
import { makeClient } from "./client";

describe("makeClient", () => {
  it("should create a new instance of client", async () => {
    const client = makeClient({
      credential: null,
    });

    const result = await client.execute<{ "?column?": number }>("SELECT 1;");

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
});
