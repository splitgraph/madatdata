import { describe, it, expect } from "vitest";
import { parseSql, extractTables } from "./parser";

describe.skip("parser", () => {
  it("parses with parseSql", () => {
    const parsed = parseSql(sampleQueries.marketingSite);

    console.log("parsed it!");
    expect(parsed).toBeTruthy();

    expect(parsed).toMatchInlineSnapshot(`
      {
        "columns": [
          {
            "alias": {
              "name": "sourceSlug",
            },
            "expr": {
              "name": "source_slug",
              "table": {
                "name": "top",
              },
              "type": "ref",
            },
          },
          {
            "alias": {
              "name": "tableName",
            },
            "expr": {
              "name": "table_name",
              "table": {
                "name": "top",
              },
              "type": "ref",
            },
          },
          {
            "alias": {
              "name": "querySlug",
            },
            "expr": {
              "name": "query_slug",
              "table": {
                "name": "top",
              },
              "type": "ref",
            },
          },
          {
            "alias": {
              "name": "query",
            },
            "expr": {
              "name": "query",
              "table": {
                "name": "top",
              },
              "type": "ref",
            },
          },
          {
            "alias": {
              "name": "queryDescription",
            },
            "expr": {
              "name": "query_description",
              "table": {
                "name": "top",
              },
              "type": "ref",
            },
          },
        ],
        "from": [
          {
            "alias": "top",
            "statement": {
              "columns": [
                {
                  "expr": {
                    "name": "*",
                    "table": {
                      "name": "queries",
                    },
                    "type": "ref",
                  },
                },
                {
                  "expr": {
                    "args": [],
                    "function": {
                      "name": "rank",
                    },
                    "over": {
                      "orderBy": [
                        {
                          "by": {
                            "name": "query_description",
                            "type": "ref",
                          },
                          "order": "ASC",
                        },
                      ],
                      "partitionBy": [
                        {
                          "name": "table_name",
                          "type": "ref",
                        },
                      ],
                    },
                    "type": "call",
                  },
                },
              ],
              "from": [
                {
                  "name": {
                    "alias": "queries",
                    "name": "xxxxx",
                  },
                  "type": "table",
                },
              ],
              "type": "select",
              "where": {
                "left": {
                  "name": "source_slug",
                  "type": "ref",
                },
                "op": "=",
                "right": {
                  "type": "string",
                  "value": "stripe",
                },
                "type": "binary",
              },
            },
            "type": "statement",
          },
        ],
        "type": "select",
        "where": {
          "left": {
            "name": "rank",
            "type": "ref",
          },
          "op": "<=",
          "right": {
            "type": "integer",
            "value": 3,
          },
          "type": "binary",
        },
      }
    `);

    console.log(parsed);
  });

  it("extracts tables with extractTables", () => {
    const tables = extractTables(parseSql(sampleQueries.marketingSite));

    expect(tables).toMatchInlineSnapshot(`
      [
        {
          "alias": "queries",
          "name": "xxxxx",
        },
      ]
    `);
  });
});

const sampleQueries = {
  marketingSite: `
SELECT
  top.source_slug as "sourceSlug",
  top.table_name as "tableName",
  top.query_slug as "querySlug",
  top.query as "query",
  top.query_description as "queryDescription"
  FROM (
    SELECT queries.*,
    rank() OVER (
        PARTITION BY table_name
        ORDER BY query_description ASC
    )
    FROM "xxxxx" as queries
    WHERE source_slug = 'stripe'
) top
WHERE RANK <= 3;
`,
};
