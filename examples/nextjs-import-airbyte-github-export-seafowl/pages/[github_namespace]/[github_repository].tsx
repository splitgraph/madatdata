import { BaseLayout } from "../../components/BaseLayout";

import { Sidebar } from "../../components/Sidebar";
import { Charts } from "../../components/RepositoryAnalytics/Charts";
import { useRouter } from "next/router";

import type { ImportedRepository } from "../../types";

import { ImportedRepoMetadata } from "../../components/RepositoryAnalytics/ImportedRepoMetadata";
import { useMemo } from "react";

const useImportedRepoFromURL = () => {
  const { query } = useRouter();

  const queryParams = useMemo(
    () =>
      (
        [
          ["github_namespace", "githubNamespace"],
          ["github_repository", "githubRepository"],
          ["splitgraphNamespace", "splitgraphNamespace"],
          ["splitgraphRepository", "splitgraphRepository"],
        ] as [string, keyof ImportedRepository][]
      ).reduce((parsedQueryParams, [queryParam, repoKey]) => {
        if (!query[queryParam] || Array.isArray(query[queryParam])) {
          // throw new Error(
          //   `Invalid query params: unexpected type of ${queryParam}: ${query[queryParam]}}`
          // );
          return parsedQueryParams;
        }

        return {
          ...parsedQueryParams,
          [repoKey]: query[queryParam] as string,
        };
      }, {} as ImportedRepository),
    [query]
  );

  return queryParams;
};

const RepositoryAnalyticsPage = () => {
  const importedRepository = useImportedRepoFromURL();

  return (
    <BaseLayout sidebar={<Sidebar />}>
      <ImportedRepoMetadata importedRepository={importedRepository} />
      <Charts importedRepository={importedRepository} />
    </BaseLayout>
  );
};

export default RepositoryAnalyticsPage;
