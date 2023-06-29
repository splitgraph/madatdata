import * as Plot from "@observablehq/plot";
import { useSqlPlot } from "../useSqlPlot";
import type { ImportedRepository, TargetSplitgraphRepo } from "../../../types";

// Assume meta namespace contains both the meta tables, and all imported repositories and tables
const META_NAMESPACE =
  process.env.NEXT_PUBLIC_SPLITGRAPH_GITHUB_ANALYTICS_META_NAMESPACE;

type Reaction =
  | "plus_one"
  | "minus_one"
  | "laugh"
  | "confused"
  | "heart"
  | "hooray"
  | "rocket"
  | "eyes";

type MappedIssueReactsByMonthRow = IssueReactsByMonthRow & {
  created_at_month: Date;
};

/**
 * A stacked bar chart of the number of reactions each month, grouped by reaction type
 */
export const IssueReactsByMonth = ({
  splitgraphNamespace,
  splitgraphRepository,
}: ImportedRepository) => {
  const renderPlot = useSqlPlot({
    sqlParams: { splitgraphNamespace, splitgraphRepository },
    buildQuery: monthlyIssueStatsTableQuery,
    mapRows: (r: IssueReactsByMonthRow) => ({
      ...r,
      created_at_month: new Date(r.created_at_month),
    }),
    reduceRows: (rows: MappedIssueReactsByMonthRow[]) => {
      const reactions = new Map<
        Reaction,
        { created_at_month: Date; count: number }[]
      >();

      for (const row of rows) {
        for (const reaction of [
          "plus_one",
          "minus_one",
          "laugh",
          "confused",
          "heart",
          "hooray",
          "rocket",
          "eyes",
        ] as Reaction[]) {
          if (!reactions.has(reaction)) {
            reactions.set(reaction, []);
          }

          reactions.get(reaction)!.push({
            created_at_month: row.created_at_month,
            count: (() => {
              switch (reaction) {
                case "plus_one":
                  return row.total_plus_ones;
                case "minus_one":
                  return row.total_minus_ones;
                case "laugh":
                  return row.total_laughs;
                case "confused":
                  return row.total_confused;
                case "heart":
                  return row.total_hearts;
                case "hooray":
                  return row.total_hoorays;
                case "rocket":
                  return row.total_rockets;
                case "eyes":
                  return row.total_eyes;
              }
            })(),
          });
        }
      }

      return Array.from(reactions.entries()).flatMap(([reaction, series]) =>
        series.map((d) => ({ reaction, ...d }))
      );
    },
    isRenderable: (p) => !!p.splitgraphRepository,

    makePlotOptions: (issueStats) => ({
      y: { grid: true, label: "Number of Reactions" },
      x: {
        label: "Month",
      },
      color: {
        legend: true,
        label: "Reaction",
        tickFormat: (reaction) => {
          switch (reaction) {
            case "plus_one":
              return "👍 plus_one";
            case "minus_one":
              return "👎 minus_one";
            case "laugh":
              return "😄 laugh";
            case "confused":
              return "😕 confused";
            case "heart":
              return "❤️ heart";
            case "hooray":
              return "🎉 hooray";
            case "rocket":
              return "🚀 rocket";
            case "eyes":
              return "👀 eyes";
          }
        },
      },
      marks: [
        Plot.rectY(issueStats, {
          x: "created_at_month",
          y: "count",
          interval: "month",
          fill: "reaction",
          tip: true,
        }),
        Plot.ruleY([0]),
      ],
    }),
  });

  return renderPlot();
};

/** Shape of row returned by {@link monthlyIssueStatsTableQuery} */
export type IssueReactsByMonthRow = {
  created_at_month: string;
  num_issues: number;
  total_reacts: number;
  total_plus_ones: number;
  total_minus_ones: number;
  total_laughs: number;
  total_confused: number;
  total_hearts: number;
  total_hoorays: number;
  total_rockets: number;
  total_eyes: number;
};

/** Time series of GitHub stargazers for the given repository */
export const monthlyIssueStatsTableQuery = ({
  splitgraphNamespace = META_NAMESPACE,
  splitgraphRepository,
}: TargetSplitgraphRepo) => {
  return `SELECT
  created_at_month,
  count(issue_number) as num_issues,
  sum(total_reacts) as total_reacts,
  sum(no_plus_one) as total_plus_ones,
  sum(no_minus_one) as total_minus_ones,
  sum(no_laugh) as total_laughs,
  sum(no_confused) as total_confused,
  sum(no_heart) as total_hearts,
  sum(no_hooray) as total_hoorays,
  sum(no_rocket) as total_rockets,
  sum(no_eyes) as total_eyes
FROM "${splitgraphNamespace}/${splitgraphRepository}"."monthly_issue_stats"
GROUP BY created_at_month
ORDER BY created_at_month ASC;`;
};
