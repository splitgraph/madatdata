import * as Plot from "@observablehq/plot";
import { useSqlPlot } from "../useSqlPlot";
import type { ImportedRepository, TargetSplitgraphRepo } from "../../../types";

// Assume meta namespace contains both the meta tables, and all imported repositories and tables
const META_NAMESPACE =
  process.env.NEXT_PUBLIC_SPLITGRAPH_GITHUB_ANALYTICS_META_NAMESPACE;

/**
 * A simple line graph showing the number of stargazers over time
 */
export const StargazersChart = ({
  splitgraphNamespace,
  splitgraphRepository,
}: ImportedRepository) => {
  const renderPlot = useSqlPlot({
    sqlParams: { splitgraphNamespace, splitgraphRepository },
    buildQuery: stargazersLineChartQuery,
    mapRows: (r: StargazersLineChartRow) => ({
      ...r,
      starred_at: new Date(r.starred_at),
    }),
    isRenderable: (p) => !!p.splitgraphRepository,
    makePlotOptions: (stargazers) => ({
      y: { grid: true },
      color: { scheme: "burd" },
      marks: [
        Plot.lineY(stargazers, {
          x: "starred_at",
          y: "cumulative_stars",
        }),
      ],
    }),
  });

  return renderPlot();
};

/** Shape of row returned by {@link stargazersLineChartQuery} */
export type StargazersLineChartRow = {
  username: string;
  cumulative_stars: number;
  starred_at: string;
};

/** Time series of GitHub stargazers for the given repository */
export const stargazersLineChartQuery = ({
  splitgraphNamespace = META_NAMESPACE,
  splitgraphRepository,
}: TargetSplitgraphRepo) => {
  return `SELECT
  COUNT(*) OVER (ORDER BY starred_at) AS cumulative_stars,
  starred_at
FROM
  "${splitgraphNamespace}/${splitgraphRepository}"."stargazers"
ORDER BY starred_at;`;
};
