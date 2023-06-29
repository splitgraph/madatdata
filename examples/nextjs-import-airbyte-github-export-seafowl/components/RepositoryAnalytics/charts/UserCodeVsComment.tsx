import * as Plot from "@observablehq/plot";
import { useSqlPlot } from "../useSqlPlot";
import type { ImportedRepository, TargetSplitgraphRepo } from "../../../types";

// Assume meta namespace contains both the meta tables, and all imported repositories and tables
const META_NAMESPACE =
  process.env.NEXT_PUBLIC_SPLITGRAPH_GITHUB_ANALYTICS_META_NAMESPACE;

type CommentLengthRow = {
  username: string;
  comment_length: number;
  net_lines_added: number;
  total_lines_added: number;
  total_lines_deleted: number;
};

const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
const mean = (arr: number[]) => sum(arr) / arr.length;

/**
 * A scatter plot of user comment length vs. lines of code
 */
export const UserCodeVsComment = ({
  splitgraphNamespace,
  splitgraphRepository,
}: ImportedRepository) => {
  const renderPlot = useSqlPlot({
    sqlParams: { splitgraphNamespace, splitgraphRepository },
    buildQuery: userStatsQuery,
    mapRows: (r: UserStatsRow) =>
      ({
        username: r.username,
        comment_length: r.total_comment_length,
        total_lines_added: r.total_lines_added,
        total_lines_deleted: r.total_lines_deleted,
        net_lines_added: r.total_lines_added - r.total_lines_deleted,
      } as CommentLengthRow),
    isRenderable: (p) => !!p.splitgraphRepository,
    reduceRows: (rows: CommentLengthRow[]) =>
      rows.filter((r) => r.username && !r.username.endsWith("[bot]")),

    makePlotOptions: (userStats: CommentLengthRow[]) => ({
      y: {
        label: "Length of Comments",
        type: "symlog",
        constant: mean(userStats.map((u) => u.comment_length)),
      },
      x: {
        label: "Lines of Code",
        type: "symlog",
        constant: mean(userStats.map((u) => u.total_lines_added)),
      },
      color: {
        scheme: "Turbo",
      },
      marks: [
        Plot.dot(userStats, {
          x: "comment_length",
          y: "total_lines_added",
          stroke: "username",
          fill: "username",
          tip: true,
        }),
        Plot.ruleY([0]),
      ],
    }),
  });

  return renderPlot();
};

/** Shape of row returned by {@link userStatsQuery} */
export type UserStatsRow = {
  username: string;
  total_commits: number;
  total_pull_request_comments: number;
  total_issue_comments: number;
  total_comment_length: number;
  total_merged_pull_requests: number;
  total_pull_requests: number;
  total_lines_added: number;
  total_lines_deleted: number;
};

/** Time series of GitHub stargazers for the given repository */
export const userStatsQuery = ({
  splitgraphNamespace = META_NAMESPACE,
  splitgraphRepository,
}: TargetSplitgraphRepo) => {
  return `SELECT
    username,
    sum(no_commits) as total_commits,
    sum(no_pull_request_comments) as total_pull_request_comments,
    sum(no_issue_comments) as total_issue_comments,
    sum(total_comment_length) as total_comment_length,
    sum(merged_pull_requests) as total_merged_pull_requests,
    sum(total_pull_requests) as total_pull_requests,
    sum(lines_added) as total_lines_added,
    sum(lines_deleted) as total_lines_deleted
FROM "${splitgraphNamespace}/${splitgraphRepository}"."monthly_user_stats"
GROUP BY username;`;
};
