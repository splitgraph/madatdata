import type { NextApiRequest, NextApiResponse } from "next";
import { makeAuthenticatedSplitgraphDb } from "../../lib/backend/splitgraph-db";
import type { DeferredSplitgraphImportTask } from "@madatdata/db-splitgraph/plugins/importers/splitgraph-base-import-plugin";

type ResponseData =
  | {
      completed: boolean;
      jobStatus: DeferredSplitgraphImportTask["response"]["jobStatus"];
    }
  | { error: string; completed: false };

/**
 * To manually send a request, example:

```bash
curl -i \
  -H "Content-Type: application/json" http://localhost:3000/api/await-import-from-github \
  -d '{ "taskId": "xxxx", "splitgraphNamespace": "xxx", "splitgraphRepo": "yyy" }'
```
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  const missing = [
    "taskId",
    "splitgraphNamespace",
    "splitgraphRepository",
  ].filter((expKey) => !req.body[expKey]);
  if (missing.length > 0) {
    res.status(400).json({
      error: `Missing required keys: ${missing.join(", ")}`,
      completed: false,
    });
    return;
  }

  const { taskId, splitgraphNamespace, splitgraphRepository } = req.body;

  try {
    const maybeCompletedTask = await pollImport({
      splitgraphTaskId: taskId,
      splitgraphDestinationNamespace: splitgraphNamespace,
      splitgraphDestinationRepository: splitgraphRepository,
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
  splitgraphDestinationNamespace,
  splitgraphDestinationRepository,
}: {
  splitgraphDestinationNamespace: string;
  splitgraphDestinationRepository: string;
  splitgraphTaskId: string;
}) => {
  const db = makeAuthenticatedSplitgraphDb();

  // NOTE: We must call this, or else requests will fail silently
  await db.fetchAccessToken();

  const maybeCompletedTask = (await db.pollDeferredTask("csv", {
    taskId: splitgraphTaskId,
    namespace: splitgraphDestinationNamespace,
    repository: splitgraphDestinationRepository,
  })) as DeferredSplitgraphImportTask;

  // NOTE: We do not include the jobLog, in case it could leak the GitHub PAT
  // (remember we're using our PAT on behalf of the users of this app)
  return {
    completed: maybeCompletedTask?.completed ?? false,
    jobStatus: maybeCompletedTask?.response.jobStatus,
    error: maybeCompletedTask?.error ?? undefined,
  };
};
