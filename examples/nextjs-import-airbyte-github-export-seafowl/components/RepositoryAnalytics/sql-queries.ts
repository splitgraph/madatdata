import type { TargetSplitgraphRepo } from "../../types";

// Assume meta namespace contains both the meta tables, and all imported repositories and tables
const META_NAMESPACE =
  process.env.NEXT_PUBLIC_SPLITGRAPH_GITHUB_ANALYTICS_META_NAMESPACE;

/**
 * Raw query to select all columns in the stargazers table, which can be
 * run on both Splitgraph and Seafowl.
 *
 * This is meant for linking to the query editor, not for rendering charts.
 */
export const makeStargazersTableQuery = ({
  splitgraphNamespace = META_NAMESPACE,
  splitgraphRepository,
}: TargetSplitgraphRepo) => {
  return `SELECT
  "repository",
  "user_id",
  "starred_at",
  "user",
  "_airbyte_ab_id",
  "_airbyte_emitted_at",
  "_airbyte_normalized_at",
  "_airbyte_stargazers_hashid"
FROM
  "${splitgraphNamespace}/${splitgraphRepository}"."stargazers"
LIMIT 100;`;
};
