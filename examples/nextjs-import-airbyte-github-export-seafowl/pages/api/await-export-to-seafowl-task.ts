import type { NextApiRequest, NextApiResponse } from "next";
import { makeAuthenticatedSplitgraphDb } from "../../lib/backend/splitgraph-db";
import type { DeferredSplitgraphExportTask } from "@madatdata/db-splitgraph/plugins/exporters/splitgraph-base-export-plugin";

type ResponseData =
  | {
      completed: boolean;
      jobStatus: DeferredSplitgraphExportTask["response"];
    }
  | { error: string; completed: false };

/**
 * To manually send a request, example:

```bash
curl -i \
  -H "Content-Type: application/json" http://localhost:3000/api/await-export-to-seafowl-task \
  -d '{ "taskId": "2923fd6f-2197-495a-9df1-2428a9ca8dee" }'
```
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (!req.body["taskId"]) {
    res.status(400).json({
      error: "Missing required key: taskId",
      completed: false,
    });
    return;
  }

  const { taskId } = req.body;

  try {
    const maybeCompletedTask = await pollImport({
      splitgraphTaskId: taskId,
    });

    if (maybeCompletedTask.error) {
      throw new Error(JSON.stringify(maybeCompletedTask.error));
    }

    res.status(200).json(maybeCompletedTask);
    return;
  } catch (err) {
    res.status(400).json({
      error: err.message,
      completed: false,
    });
    return;
  }
}

const pollImport = async ({
  splitgraphTaskId,
}: {
  splitgraphTaskId: string;
}) => {
  const db = makeAuthenticatedSplitgraphDb();

  // NOTE: We must call this, or else requests will fail silently
  await db.fetchAccessToken();

  const maybeCompletedTask = (await db.pollDeferredTask("export-to-seafowl", {
    taskId: splitgraphTaskId,
  })) as DeferredSplitgraphExportTask;

  // NOTE: We do not include the jobLog, in case it could leak the GitHub PAT
  // (remember we're using our PAT on behalf of the users of this app)
  return {
    completed: maybeCompletedTask?.completed ?? false,
    jobStatus: maybeCompletedTask?.response,
    error: maybeCompletedTask?.error ?? undefined,
  };
};
