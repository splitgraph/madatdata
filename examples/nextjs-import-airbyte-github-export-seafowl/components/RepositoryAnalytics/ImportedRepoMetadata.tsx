import type { ImportedRepository } from "../../types";
import style from "./ImportedRepoMetadata.module.css";

import { makeStargazersTableQuery } from "./sql-queries";

// Assume meta namespace contains both the meta tables, and all imported repositories and tables
const META_NAMESPACE =
  process.env.NEXT_PUBLIC_SPLITGRAPH_GITHUB_ANALYTICS_META_NAMESPACE;

interface ImportedRepoMetadataProps {
  importedRepository: ImportedRepository;
}

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
    </div>
  );
};

const SplitgraphRepoLink = ({
  splitgraphNamespace,
  splitgraphRepository,
}: ImportedRepository) => {
  return (
    <a
      target="_blank"
      href={`https://www.splitgraph.com/${splitgraphNamespace}/${splitgraphRepository}`}
    >
      {`splitgraph.com/${splitgraphNamespace}/${splitgraphRepository}`}
    </a>
  );
};

const GitHubRepoLink = ({
  githubNamespace,
  githubRepository,
}: ImportedRepository) => {
  return (
    <a
      target="_blank"
      href={`https://github.com/${githubNamespace}/${githubRepository}`}
    >{`github.com/${githubNamespace}/${githubRepository}`}</a>
  );
};

const SplitgraphQueryLink = ({
  importedRepository,
  makeQuery,
  tableName,
}: {
  importedRepository: ImportedRepository;
  makeQuery: (repo: ImportedRepository) => string;
  tableName: string;
}) => {
  return (
    <a
      href={makeSplitgraphQueryHref(makeQuery(importedRepository))}
      target="_blank"
    >
      Query {tableName} in the Splitgraph Console
    </a>
  );
};

const SeafowlQueryLink = ({
  importedRepository,
  makeQuery,
  tableName,
}: {
  importedRepository: ImportedRepository;
  makeQuery: (repo: ImportedRepository) => string;
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
const makeSplitgraphQueryHref = (sqlQuery: string) => {
  const url = `https://www.splitgraph.com/query?${new URLSearchParams({
    sqlQuery: sqlQuery,
    flavor: "splitgraph",
  }).toString()}`;

  return url;
};

/** Return the URL to Splitgraph Console pointing to Seafowl db where we export tables */
const makeSeafowlQueryHref = (sqlQuery: string) => {
  return `https://www.splitgraph.com/query?${new URLSearchParams({
    sqlQuery: sqlQuery,
    flavor: "seafowl",
    // Splitgraph exports to Seafowl dbname matching the username of the exporting user
    "database-name": META_NAMESPACE,
  })}`;
};
