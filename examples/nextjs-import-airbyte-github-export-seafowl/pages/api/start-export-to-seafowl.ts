import type { NextApiRequest, NextApiResponse } from "next";
import { makeAuthenticatedSplitgraphDb } from "../../lib/backend/splitgraph-db";

import type {
  ExportTableInput,
  ExportQueryInput,
  StartExportToSeafowlRequestShape,
  StartExportToSeafowlResponseData,
} from "../../types";

/**
 * To manually send a request, example:

```bash
curl -i \
  -H "Content-Type: application/json" http://localhost:3000/api/start-export-to-seafowl \
  -d '{ "tables": [{"namespace": "miles", "repository": "import-via-nextjs", "table": "stargazers"}] }'
```
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StartExportToSeafowlResponseData>
) {
  const db = makeAuthenticatedSplitgraphDb();
  const { tables = [], queries = [] } = req.body;

  if (tables.length === 0 && queries.length === 0) {
    res.status(400).json({ error: "no tables or queries provided for export" });
    return;
  }

  const errors = [];

  if (
    tables.length > 0 &&
    !tables.every(
      (t: ExportTableInput) =>
        t.namespace &&
        t.repository &&
        t.table &&
        typeof t.namespace === "string" &&
        typeof t.repository === "string" &&
        typeof t.table === "string"
    )
  ) {
    errors.push("invalid tables input in request body");
  }

  if (
    queries.length > 0 &&
    !queries.every(
      (q: ExportQueryInput) =>
        q.sourceQuery &&
        q.destinationSchema &&
        q.destinationTable &&
        typeof q.sourceQuery === "string" &&
        typeof q.destinationSchema === "string" &&
        typeof q.destinationTable === "string"
    )
  ) {
    errors.push("invalid queries input in request body");
  }

  if (errors.length > 0) {
    res.status(400).json({ error: `Invalid request: ${errors.join(", ")}` });
    return;
  }

  try {
    const { tables: exportingTables, queries: exportingQueries } =
      await startExport({
        db,
        tables,
        queries,
      });
    res.status(200).json({
      tables: exportingTables,
      queries: exportingQueries,
    });
  } catch (err) {
    res.status(400).json({
      error: err.message,
    });
  }
}

const startExport = async ({
  db,
  tables,
  queries,
}: {
  db: ReturnType<typeof makeAuthenticatedSplitgraphDb>;
  tables: ExportTableInput[];
  queries: ExportQueryInput[];
}) => {
  await db.fetchAccessToken();

  const response = await db.exportData(
    "export-to-seafowl",
    {
      queries: queries.map((query) => ({
        source: {
          query: query.sourceQuery,
        },
        destination: {
          schema: query.destinationSchema,
          table: query.destinationTable,
        },
      })),
      tables: tables.map((splitgraphSource) => ({
        source: {
          repository: splitgraphSource.repository,
          namespace: splitgraphSource.namespace,
          table: splitgraphSource.table,
        },
      })),
    },
    {
      // Empty instance will trigger Splitgraph to export to demo.seafowl.cloud
      seafowlInstance: {},
    },
    { defer: true }
  );

  if (response.error) {
    throw new Error(JSON.stringify(response.error));
  }

  const loadingTableTaskId =
    response.taskIds.tables.length === 1
      ? response.taskIds.tables[0].jobId
      : null;

  // NOTE: We return a list of tables, and duplicate the taskId in each of them,
  // even though there is only one taskId for all tables. It's up to the frontend
  // how many requests it wants to send when polling for status updates.
  const loadingTables = loadingTableTaskId
    ? response.taskIds.tables[0].tables.map(
        (t: { sourceTable: string; sourceRepository: string }) => ({
          taskId: loadingTableTaskId,
          destinationTable: t.sourceTable,
          destinationSchema: t.sourceRepository,
        })
      )
    : [];

  const loadingQueries = response.taskIds.queries.map(
    (
      queryJob: {
        jobId: string;
        destinationSchema: string;
        destinationTable: string;
        sourceQuery: string;
      },
      i: number
    ) => ({
      taskId: queryJob.jobId,
      destinationSchema: queries[i].destinationSchema,
      destinationTable: queries[i].destinationTable,
      sourceQuery: queries[i].sourceQuery,
    })
  );

  return {
    tables: loadingTables,
    queries: loadingQueries,
  };
};
