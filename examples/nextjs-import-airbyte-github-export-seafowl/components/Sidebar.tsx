import React, { useMemo } from "react";
import Link from "next/link";
import styles from "./Sidebar.module.css";
import { SqlProvider, makeSplitgraphHTTPContext } from "@madatdata/react";
import { useSql } from "@madatdata/react";

import type { ImportedRepository } from "../types";

const META_REPOSITORY =
  process.env.NEXT_PUBLIC_SPLITGRAPH_GITHUB_ANALYTICS_META_REPOSITORY;
const META_NAMESPACE =
  process.env.NEXT_PUBLIC_SPLITGRAPH_GITHUB_ANALYTICS_META_NAMESPACE;
const META_TABLE =
  process.env.NEXT_PUBLIC_SPLITGRAPH_GITHUB_ANALYTICS_META_COMPLETED_TABLE;

const useImportedRepositories = (): ImportedRepository[] => {
  const { response, error } = useSql<{
    githubNamespace: string;
    githubRepository: string;
    splitgraphNamespace: string;
    splitgraphRepository: string;
  }>(
    `
    WITH ordered_repos AS (
      SELECT
          github_namespace,
          github_repository,
          splitgraph_namespace,
          splitgraph_repository,
          completed_at
      FROM "${META_NAMESPACE}/${META_REPOSITORY}"."${META_TABLE}"
      ORDER BY completed_at DESC
    )
    SELECT DISTINCT
        github_namespace AS "githubNamespace",
        github_repository AS "githubRepository",
        splitgraph_namespace AS "splitgraphNamespace",
        splitgraph_repository AS "splitgraphRepository"
    FROM ordered_repos;
    `
  );

  const repositories = useMemo(() => {
    if (error) {
      console.warn("Error fetching repositories:", error);
      return [];
    }

    if (!response) {
      return [];
    }

    return response.rows ?? [];
  }, [error, response]);

  return repositories;
};

const RepositoriesList = () => {
  const repositories = useImportedRepositories();

  return (
    <ul className={styles.repoList}>
      {repositories.map((repo, index) => (
        <li key={index}>
          <Link
            href={`/${repo.githubNamespace}/${repo.githubRepository}?splitgraphNamespace=${repo.splitgraphNamespace}&splitgraphRepository=${repo.splitgraphRepository}`}
          >
            {repo.githubNamespace}/{repo.githubRepository}
          </Link>
        </li>
      ))}
    </ul>
  );
};

export const Sidebar = () => {
  const splitgraphDataContext = useMemo(
    () => makeSplitgraphHTTPContext({ credential: null }),
    []
  );

  return (
    <aside className={styles.sidebar}>
      <div className={styles.importButtonContainer}>
        <Link href="/" className={styles.importButton}>
          Import Your Repository
        </Link>
      </div>
      <SqlProvider dataContext={splitgraphDataContext}>
        <RepositoriesList />
      </SqlProvider>
    </aside>
  );
};
