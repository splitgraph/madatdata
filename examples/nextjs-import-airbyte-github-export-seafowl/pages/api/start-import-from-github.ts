import type { NextApiRequest, NextApiResponse } from "next";
import {
  makeAuthenticatedSplitgraphDb,
  claimsFromJWT,
} from "../../lib/backend/splitgraph-db";
import { relevantGitHubTableNamesForImport } from "../../lib/config/github-tables";

const GITHUB_PAT_SECRET = process.env.GITHUB_PAT_SECRET;

type ResponseData =
  | {
      destination: {
        splitgraphNamespace: string;
        splitgraphRepository: string;
      };
      taskId: string;
    }
  | { error: string };

/**
 * To manually send a request, example:

```bash
curl -i \
  -H "Content-Type: application/json" http://localhost:3000/api/start-import-from-github \
  -d '{ "githubSourceRepository": "splitgraph/seafowl", "splitgraphDestinationRepository": "import-via-nextjs" }'
```
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  const db = makeAuthenticatedSplitgraphDb();
  const { username } = claimsFromJWT((await db.fetchAccessToken()).token);

  const { githubSourceRepository } = req.body;

  if (!githubSourceRepository) {
    res.status(400).json({ error: "githubSourceRepository is required" });
    return;
  }

  const splitgraphDestinationRepository =
    req.body.splitgraphDestinationRepository ??
    `github-import-${githubSourceRepository.replaceAll("/", "-")}`;

  try {
    const taskId = await startImport({
      db,
      githubSourceRepository,
      splitgraphDestinationRepository,
      githubStartDate: req.body.githubStartDate,
    });
    res.status(200).json({
      destination: {
        splitgraphNamespace: username,
        splitgraphRepository: splitgraphDestinationRepository,
      },
      taskId,
    });
  } catch (err) {
    res.status(400).json({
      error: err.message,
    });
  }
}

const startImport = async ({
  db,
  githubSourceRepository,
  splitgraphDestinationRepository,
  githubStartDate,
}: {
  db: ReturnType<typeof makeAuthenticatedSplitgraphDb>;
  githubSourceRepository: string;
  splitgraphDestinationRepository: string;
  /**
   * Optional start date for ingestion, must be in format like: 2021-06-01T00:00:00Z
   * Defaults to 2020-01-01T00:00:00Z
   * */
  githubStartDate?: string;
}) => {
  const { username: splitgraphNamespace } = claimsFromJWT(
    (await db.fetchAccessToken()).token
  );

  const { taskId } = await db.importData(
    "airbyte-github",
    {
      credentials: {
        credentials: {
          personal_access_token: GITHUB_PAT_SECRET,
        },
      },
      params: {
        repository: githubSourceRepository,
        start_date: githubStartDate ?? "2023-01-01T00:00:00Z",
        page_size_for_large_streams: 100,
      },
    },
    {
      namespace: splitgraphNamespace,
      repository: splitgraphDestinationRepository,
      tables: [
        ...relevantGitHubTableNamesForImport.map((t) => ({
          name: t,
          options: {},
          schema: [],
        })),
      ],
    },
    { defer: true }
  );

  return taskId;
};
