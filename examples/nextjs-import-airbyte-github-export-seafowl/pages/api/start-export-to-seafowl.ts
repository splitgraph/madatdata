import type { NextApiRequest, NextApiResponse } from "next";
import { makeAuthenticatedSplitgraphDb } from "../../lib-backend/splitgraph-db";

type ResponseData =
  | {
      tables: {
        tableName: string;
        taskId: string;
      }[];
    }
  | { error: string };

type TableInput = { namespace: string; repository: string; table: string };

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
  res: NextApiResponse<ResponseData>
) {
  const db = makeAuthenticatedSplitgraphDb();
  const { tables } = req.body;

  if (
    !tables ||
    !tables.length ||
    !tables.every(
      (t: TableInput) =>
        t.namespace &&
        t.repository &&
        t.table &&
        typeof t.namespace === "string" &&
        typeof t.repository === "string" &&
        typeof t.table === "string"
    )
  ) {
    res.status(400).json({ error: "invalid tables input in request body" });
    return;
  }

  try {
    const exportingTables = await startExport({
      db,
      tables,
    });
    res.status(200).json({
      tables: exportingTables,
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
}: {
  db: ReturnType<typeof makeAuthenticatedSplitgraphDb>;
  tables: TableInput[];
}) => {
  await db.fetchAccessToken();

  const response = await db.exportData(
    "export-to-seafowl",
    {
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

  const loadingTables: { taskId: string; tableName: string }[] =
    response.taskIds.tables.map(
      (t: { jobId: string; sourceTable: string }) => ({
        taskId: t.jobId,
        tableName: t.sourceTable,
      })
    );

  return loadingTables;
};
