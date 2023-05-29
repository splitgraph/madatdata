import type { NextApiRequest, NextApiResponse } from "next";
import {
  makeAuthenticatedSplitgraphHTTPContext,
  claimsFromJWT,
} from "../../lib/backend/splitgraph-db";

export type MarkImportExportCompleteRequestShape = {
  githubSourceNamespace: string;
  githubSourceRepository: string;
  splitgraphDestinationRepository: string;
};

export type MarkImportExportCompleteSuccessResponse = {
  status: "inserted";
};

export type MarkImportExportCompleteResponseData =
  | MarkImportExportCompleteSuccessResponse
  | { error: string };

const META_NAMESPACE =
  process.env.NEXT_PUBLIC_SPLITGRAPH_GITHUB_ANALYTICS_META_NAMESPACE;
const META_REPOSITORY =
  process.env.NEXT_PUBLIC_SPLITGRAPH_GITHUB_ANALYTICS_META_REPOSITORY;
const META_TABLE =
  process.env.NEXT_PUBLIC_SPLITGRAPH_GITHUB_ANALYTICS_META_COMPLETED_TABLE;

/**
 * To manually send a request, example:

```bash
curl -i \
  -H "Content-Type: application/json" http://localhost:3000/api/mark-import-export-complete \
  -d@- <<EOF
{"githubSourceNamespace": "splitgraph",
"githubSourceRepository": "seafowl",
"splitgraphDestinationRepository": "gh-import-splitgraph-seafowl" }
EOF
```
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MarkImportExportCompleteResponseData>
) {
  if (!META_NAMESPACE) {
    res.status(400).json({
      error:
        "Missing env var: NEXT_PUBLIC_SPLITGRAPH_GITHUB_ANALYTICS_META_NAMESPACE " +
        "Is it in .env.local or Vercel secrets?",
    });
    return;
  }

  if (!META_REPOSITORY) {
    res.status(400).json({
      error:
        "Missing env var: NEXT_PUBLIC_SPLITGRAPH_GITHUB_ANALYTICS_META_REPOSITORY " +
        "Is it in .env or Vercel environment variables?",
    });
    return;
  }

  const missingOrInvalidKeys = [
    "githubSourceNamespace",
    "githubSourceRepository",
    "splitgraphDestinationRepository",
  ].filter(
    (requiredKey) =>
      !(requiredKey in req.body) ||
      typeof req.body[requiredKey] !== "string" ||
      !req.body[requiredKey] ||
      !isSQLSafe(req.body[requiredKey])
  );

  if (missingOrInvalidKeys.length > 0) {
    res.status(400).json({
      error: `missing, non-string, empty or invalid keys: ${missingOrInvalidKeys.join(
        ", "
      )}`,
    });
    return;
  }

  try {
    const { status } = await markImportExportAsComplete({
      githubSourceNamespace: req.body.githubSourceNamespace,
      githubSourceRepository: req.body.githubSourceRepository,
      splitgraphDestinationRepository: req.body.splitgraphDestinationRepository,
    });

    if (status === "already exists") {
      res.status(204).end();
      return;
    }

    res.status(200).json({ status });
    return;
  } catch (err) {
    res.status(400).json({ error: err });
    return;
  }
}

/**
 * NOTE: We assume that this table already exists. If it does not exist, you can
 * create it manually with a query like this in https://www.splitgraph.com/query :
 *
 * ```sql
CREATE TABLE IF NOT EXISTS "miles/github-analytics-metadata".completed_repositories (
  github_namespace VARCHAR NOT NULL,
  github_repository VARCHAR NOT NULL,
  splitgraph_namespace VARCHAR NOT NULL,
  splitgraph_repository VARCHAR NOT NULL,
  completed_at TIMESTAMP NOT NULL
);
```
 */
const markImportExportAsComplete = async ({
  splitgraphDestinationRepository,
  githubSourceNamespace,
  githubSourceRepository,
}: MarkImportExportCompleteRequestShape): Promise<{
  status: "already exists" | "inserted";
}> => {
  const { db, client } = makeAuthenticatedSplitgraphHTTPContext();
  const { username } = claimsFromJWT((await db.fetchAccessToken()).token);

  // NOTE: We also assume that META_NAMESPACE is the same as destination namespace
  if (!username || username !== META_NAMESPACE) {
    throw new Error(
      "Authenticated user does not match NEXT_PUBLIC_SPLITGRAPH_GITHUB_ANALYTICS_META_NAMESPACE"
    );
  }

  // We don't want to insert the row if it already exists
  // Note that Splitgraph doesn't support constraints so we can't use INSERT ON CONFLICT

  const existingRows = await client.execute(`
    SELECT splitgraph_repository FROM "${META_NAMESPACE}/${META_REPOSITORY}"."${META_TABLE}"
    WHERE github_namespace = '${githubSourceNamespace}'
    AND github_repository = '${githubSourceRepository}'
    AND splitgraph_namespace = '${META_NAMESPACE}'
    AND splitgraph_repository = '${splitgraphDestinationRepository}';
  `);

  if (existingRows.response && existingRows.response.rows.length > 0) {
    return { status: "already exists" };
  }

  await client.execute(`INSERT INTO "${META_NAMESPACE}/${META_REPOSITORY}"."${META_TABLE}" (
    github_namespace,
    github_repository,
    splitgraph_namespace,
    splitgraph_repository,
    completed_at
) VALUES (
    '${githubSourceNamespace}',
    '${githubSourceRepository}',
    '${META_NAMESPACE}',
    '${splitgraphDestinationRepository}',
    NOW()
);`);

  return { status: "inserted" };
};

/**
 * Return `false` if the string contains any character other than alphanumeric,
 * `-`, `_`, or `.`
 */
const isSQLSafe = (str: string) => !/[^a-z0-9\-_\.]/.test(str);
