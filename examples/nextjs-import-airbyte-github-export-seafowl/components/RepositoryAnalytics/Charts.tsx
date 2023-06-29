import style from "./Charts.module.css";

import type { ImportedRepository } from "../../types";
import { SqlProvider, makeSeafowlHTTPContext } from "@madatdata/react";

import { useMemo } from "react";

import { StargazersChart } from "./charts/StargazersChart";
import { IssueReactsByMonth } from "./charts/IssueReactsByMonth";
import { UserCodeVsComment } from "./charts/UserCodeVsComment";

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
        <h3>Stargazers</h3>
        <StargazersChart {...importedRepository} />
        <h3>Issue Reacts by Month</h3>
        <IssueReactsByMonth {...importedRepository} />
        <h3>Code vs. Comment Length</h3>
        <UserCodeVsComment {...importedRepository} />
      </SqlProvider>
    </div>
  );
};
