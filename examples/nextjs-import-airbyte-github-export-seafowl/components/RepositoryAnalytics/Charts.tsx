import style from "./Charts.module.css";
import { useEffect, useRef } from "react";

import type { ImportedRepository } from "../../types";
import { SqlProvider, makeSeafowlHTTPContext, useSql } from "@madatdata/react";

import * as Plot from "@observablehq/plot";
import { useMemo } from "react";

import {
  stargazersLineChartQuery,
  type StargazersLineChartRow,
} from "./sql-queries";

export interface ChartsProps {
  importedRepository: ImportedRepository;
}

// Assume meta namespace contains both the meta tables, and all imported repositories and tables
const META_NAMESPACE =
  process.env.NEXT_PUBLIC_SPLITGRAPH_GITHUB_ANALYTICS_META_NAMESPACE;

export const Charts = ({ importedRepository }: ChartsProps) => {
  const seafowlDataContext = useMemo(
    () =>
      makeSeafowlHTTPContext("https://demo.seafowl.cloud", {
        dbname: META_NAMESPACE,
      }),
    []
  );

  return (
    <div className={style.charts}>
      <SqlProvider dataContext={seafowlDataContext}>
        <StargazersChart {...importedRepository} />
      </SqlProvider>
    </div>
  );
};

const StargazersChart = ({
  splitgraphNamespace,
  splitgraphRepository,
}: ImportedRepository) => {
  const containerRef = useRef<HTMLDivElement>();

  const { response, error } = useSql<StargazersLineChartRow>(
    stargazersLineChartQuery({ splitgraphNamespace, splitgraphRepository })
  );

  const stargazers = useMemo(() => {
    return !response || error
      ? []
      : (response.rows ?? []).map((r) => ({
          ...r,
          starred_at: new Date(r.starred_at),
        }));
  }, [response, error]);

  useEffect(() => {
    if (stargazers === undefined) {
      return;
    }

    const plot = Plot.plot({
      y: { grid: true },
      color: { scheme: "burd" },
      marks: [
        Plot.lineY(stargazers, {
          x: "starred_at",
          y: "cumulative_stars",
        }),
        // NOTE: We don't have username when querying Seafowl because it's within a JSON object,
        // and seafowl doesn't support querying inside JSON objects
        // Plot.tip(
        //   stargazers,
        //   Plot.pointer({
        //     x: "starred_at",
        //     y: "cumulative_stars",
        //     title: (d) => `${d.username} was stargazer #${d.cumulative_stars}`,
        //   })
        // ),
      ],
    });

    // There is a bug(?) in useSql where, since we can't give it dependencies, it
    // will re-run even with splitgraphNamespace and splitgraphRepository are undefined,
    // which results in an error querying Seafowl. So just don't render the chart in that case.
    if (splitgraphNamespace && splitgraphRepository) {
      containerRef.current.append(plot);
    }

    return () => plot.remove();
  }, [stargazers]);

  return (
    <>
      <h3>Stargazers</h3>
      <div ref={containerRef} />
    </>
  );
};
