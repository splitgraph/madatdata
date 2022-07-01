import { astVisitor, parseFirst, Statement } from "pgsql-ast-parser";
// https://github.com/oguimbal/pgsql-ast-parser

export const parseSql = (query: string) => {
  return parseFirst(query);
};

export const extractTables = (ast: Statement) => {
  const tables: NodeFromVisitorCallback<"tableRef">[] = [];

  const visitor = astVisitor((_map) => ({
    tableRef: (tbl) => tables.push(tbl),
  }));

  visitor.statement(ast);

  console.log("Referenced tables:", tables);

  return tables;
};

type NodeTag = keyof NonNullable<ReturnType<Parameters<typeof astVisitor>[0]>>;

type NodeFromVisitorCallback<Tag extends NodeTag> = Parameters<
  NonNullable<ReturnType<Parameters<typeof astVisitor>[0]>[Tag]>
>[0];
