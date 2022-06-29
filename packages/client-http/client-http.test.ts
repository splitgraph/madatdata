import { describe, it, expect, beforeEach } from "vitest";
import { makeClient } from "./client-http";
import { setupMswServerTestHooks } from "@madatdata/test-helpers/msw-server-hooks";
import { shouldSkipIntegrationTests } from "@madatdata/test-helpers/env-config";
import { rest } from "msw";

import { defaultHost } from "@madatdata/base-client/host";

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
    });

    const result = await client.execute<{ "?column?": number }>(
      "SELECT 1, 2, 3;",
      { rowMode: "array" }
    );

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
