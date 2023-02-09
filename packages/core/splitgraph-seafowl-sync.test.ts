import { describe, it, expect } from "vitest";
import {
  shouldSkipIntegrationTests,
  shouldSkipSeafowlTests,
} from "@madatdata/test-helpers/env-config";
import { randSuffix } from "@madatdata/test-helpers/rand-suffix";
import { createRealDataContext as createRealSeafowlDataContext } from "./seafowl.test";
import { createRealDataContext as createRealSplitgraphDataContext } from "./splitgraph.test";
import type { SeafowlDestOptions } from "packages/db-seafowl/plugins/importers/base-seafowl-import-plugin";

describe.skipIf(shouldSkipSeafowlTests() || shouldSkipIntegrationTests())(
  "export splitgraph -> (parquet) -> URL -> seafowl, then query in seafowl",
  () => {
    it("can export from splitgraph", async () => {
      const splitgraph = createRealSplitgraphDataContext();
      const seafowl = createRealSeafowlDataContext();

      const { response } = await splitgraph.db.exportData(
        "exportQuery",
        {
          query: `SELECT a as int_val, string_agg(random()::text, '') as text_val
FROM generate_series(1, 5) a, generate_series(1, 50) b
GROUP BY a ORDER BY a;`,
          vdbId: "ddn",
        },
        {
          format: "parquet",
          filename: "random-series",
        }
      );

      const exportURL = response?.output.url;
      expect(exportURL).toBeDefined();

      const seafowlDestOpts: SeafowlDestOptions = {
        tableName: `irrelevant_${randSuffix()}`,
        // TODO: schemaName is currently a no-op (just not included in the interpolation of CREATE TABLE query)
        schemaName: "public",
      };

      const seafowlResp = await seafowl.db.importData(
        "csv",
        { url: exportURL!, format: "parquet" },
        seafowlDestOpts
      );

      expect(seafowlResp.response?.success).toBe(true);

      expect(seafowlResp).toMatchInlineSnapshot(`
      {
        "error": null,
        "info": {
          "mountError": null,
          "mountResponse": {
            "readable": [Function],
            "rows": [],
            "success": true,
          },
        },
        "response": {
          "readable": [Function],
          "rows": [],
          "success": true,
        },
      }
    `);

      const queryResult = await seafowl.client.execute<{
        int_val: number;
        text_val: string;
      }>(`SELECT * FROM ${seafowlDestOpts.tableName};`);

      expect(queryResult.response?.success).toEqual(true);
      expect(queryResult.response?.rows.length).toEqual(5);

      // Check each row has an int_val and text_val column with appropriate types
      // by asserting same length of original list and filtered list of matches
      expect(
        queryResult.response?.rows.filter(
          (row) =>
            Object.keys(row).length === 2 &&
            Object.keys(row).includes("int_val") &&
            Object.keys(row).includes("text_val") &&
            typeof row["int_val"] === "number" &&
            typeof row["text_val"] === "string"
        ).length
      ).toStrictEqual(queryResult.response?.rows.length);

      expect({
        ...queryResult.response,
        rows: queryResult.response?.rows.map((row) => ({
          ...row,
          text_val: "unsnapshottable-random-text-val",
        })),
      }).toMatchInlineSnapshot(`
      {
        "readable": [Function],
        "rows": [
          {
            "int_val": 1,
            "text_val": "unsnapshottable-random-text-val",
          },
          {
            "int_val": 2,
            "text_val": "unsnapshottable-random-text-val",
          },
          {
            "int_val": 3,
            "text_val": "unsnapshottable-random-text-val",
          },
          {
            "int_val": 4,
            "text_val": "unsnapshottable-random-text-val",
          },
          {
            "int_val": 5,
            "text_val": "unsnapshottable-random-text-val",
          },
        ],
        "success": true,
      }
    `);
    }, 30_000);
  }
);
