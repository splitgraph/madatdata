import { describe, it, expect } from "vitest";
import { makeClient } from "./client";
import { setupServer } from "msw/node";
import { setupMswServerTestHooks } from "@madatdata/test-helpers/msw-server-hooks";
import { rest } from "msw";

import { defaultHost } from "@madatdata/client-base/host";

describe("makeClient creates a client which", () => {
  const mswServer = setupServer();
  setupMswServerTestHooks(mswServer);
  mswServer.use(
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
});
