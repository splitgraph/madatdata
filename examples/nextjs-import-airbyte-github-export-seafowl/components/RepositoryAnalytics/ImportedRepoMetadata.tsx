import { ComponentProps } from "react";
import type { ImportedRepository } from "../../types";
import style from "./ImportedRepoMetadata.module.css";

import { makeStargazersTableQuery } from "./sql-queries";

// Assume meta namespace contains both the meta tables, and all imported repositories and tables
const META_NAMESPACE =
  process.env.NEXT_PUBLIC_SPLITGRAPH_GITHUB_ANALYTICS_META_NAMESPACE;

interface ImportedRepoMetadataProps {
  importedRepository: ImportedRepository;
}

type SplitgraphRepository = Pick<
  ImportedRepository,
  "splitgraphNamespace" | "splitgraphRepository"
>;

export const ImportedRepoMetadata = ({
  importedRepository,
}: ImportedRepoMetadataProps) => {
  return (
    <div className={style.importedRepoMetadata}>
      <h1>
        <GitHubRepoLink {...importedRepository} />
      </h1>
      <h2>GitHub Analytics</h2>

      <ul>
        <li>
          Browse the data: <SplitgraphRepoLink {...importedRepository} />
        </li>
        <li>
          <SplitgraphQueryLink
            importedRepository={importedRepository}
            tableName={"stargazers"}
            makeQuery={makeStargazersTableQuery}
          />
        </li>
        <li>
          <SeafowlQueryLink
            importedRepository={importedRepository}
            tableName={"stargazers"}
            makeQuery={makeStargazersTableQuery}
          />
        </li>
      </ul>
      <SeafowlEmbeddedQuery
        importedRepository={importedRepository}
        tableName={"stargazers"}
        makeQuery={makeStargazersTableQuery}
      />
    </div>
  );
};

export const SplitgraphRepoLink = ({
  splitgraphNamespace,
  splitgraphRepository,
}: Pick<
  ImportedRepository,
  "splitgraphNamespace" | "splitgraphRepository"
>) => {
  return (
    <a
      target="_blank"
      href={`https://www.splitgraph.com/${splitgraphNamespace}/${splitgraphRepository}`}
    >
      {`splitgraph.com/${splitgraphNamespace}/${splitgraphRepository}`}
    </a>
  );
};

export const GitHubRepoLink = ({
  githubNamespace,
  githubRepository,
}: Pick<ImportedRepository, "githubNamespace" | "githubRepository">) => {
  return (
    <a
      target="_blank"
      href={`https://github.com/${githubNamespace}/${githubRepository}`}
    >{`github.com/${githubNamespace}/${githubRepository}`}</a>
  );
};

export const SplitgraphQueryLink = ({
  importedRepository,
  makeQuery,
  tableName,
}: {
  importedRepository: SplitgraphRepository;
  makeQuery: (repo: SplitgraphRepository) => string;
  tableName: string;
}) => {
  return (
    <a
      href={makeSplitgraphQueryHref(makeQuery(importedRepository))}
      target="_blank"
    >
      Query the {tableName} table in the Splitgraph Console
    </a>
  );
};

export const SplitgraphStargazersQueryLink = ({
  ...importedRepository
}: SplitgraphRepository) => {
  return (
    <SplitgraphQueryLink
      importedRepository={importedRepository}
      tableName={"stargazers"}
      makeQuery={makeStargazersTableQuery}
    />
  );
};

export const SeafowlStargazersQueryLink = ({
  ...importedRepository
}: SplitgraphRepository) => {
  return (
    <SeafowlQueryLink
      importedRepository={importedRepository}
      tableName={"stargazers"}
      makeQuery={makeStargazersTableQuery}
    />
  );
};

const SeafowlQueryLink = ({
  importedRepository,
  makeQuery,
  tableName,
}: {
  importedRepository: SplitgraphRepository;
  makeQuery: (repo: SplitgraphRepository) => string;
  tableName: string;
}) => {
  return (
    <a
      href={makeSeafowlQueryHref(makeQuery(importedRepository))}
      target="_blank"
    >
      Query Seafowl table {tableName} using the Splitgraph Console
    </a>
  );
};

/** Return the URL to Splitgraph Console pointing to Splitgraph DDN */
export const makeSplitgraphQueryHref = (sqlQuery: string) => {
  const url = `https://www.splitgraph.com/query?${new URLSearchParams({
    sqlQuery: sqlQuery,
    flavor: "splitgraph",
  }).toString()}`;

  return url;
};

/** Return the URL to Splitgraph Console pointing to Seafowl db where we export tables */
export const makeSeafowlQueryHref = (sqlQuery: string) => {
  return `https://www.splitgraph.com/query?${new URLSearchParams({
    sqlQuery: sqlQuery,
    flavor: "seafowl",
    // Splitgraph exports to Seafowl dbname matching the username of the exporting user
    "database-name": META_NAMESPACE,
  })}`;
};

export interface EmbeddedQueryProps {
  importedRepository: SplitgraphRepository;
  makeQuery: (repo: SplitgraphRepository) => string;
  tableName: string;
}

export const SplitgraphEmbeddedQuery = ({
  importedRepository,
  makeQuery,
}: EmbeddedQueryProps) => {
  return (
    <iframe
      src={makeSplitgraphEmbeddableQueryHref(makeQuery(importedRepository))}
      allowFullScreen={false}
      style={{ border: "none" }}
      height={"400px"}
    />
  );
};

export const SeafowlEmbeddedQuery = ({
  importedRepository,
  makeQuery,
}: EmbeddedQueryProps) => {
  return (
    <iframe
      src={makeSeafowlEmbeddableQueryHref(makeQuery(importedRepository))}
      style={{ border: "none" }}
      height={"400px"}
    />
  );
};

/** Return the URL to Splitgraph Console pointing to Seafowl db where we export tables */
const makeSeafowlEmbeddableQueryHref = (sqlQuery: string) => {
  return `https://www.splitgraph.com/embeddable-seafowl-console/query-editor?${new URLSearchParams(
    {
      "sql-query": sqlQuery,
      // Splitgraph exports to Seafowl dbname matching the username of the exporting user
      database: META_NAMESPACE,
    }
  )}`;
};

const makeSplitgraphEmbeddableQueryHref = (sqlQuery: string) => {
  return `https://www.splitgraph.com/embed/workspace/ddn?${new URLSearchParams({
    layout: "query",
    query: sqlQuery,
  })}`;
};
