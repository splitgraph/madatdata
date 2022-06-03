import { parse, parseFirst, Statement } from "pgsql-ast-parser";
// https://github.com/oguimbal/pgsql-ast-parser

const query = `
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
`;

const ast: Statement = parseFirst(query);

// console.log("the ast is...", ast);

console.log(JSON.stringify(ast, null, 2));

// debugger;

// console.log("done or something lol");
