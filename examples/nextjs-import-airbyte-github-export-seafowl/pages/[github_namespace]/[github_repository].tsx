import { BaseLayout } from "../../components/BaseLayout";

import { Sidebar } from "../../components/Sidebar";
import { Charts } from "../../components/RepositoryAnalytics/Charts";
import { useRouter } from "next/router";

import type { ImportedRepository } from "../../types";

const useImportedRepoFromURL = () => {
  const { query } = useRouter();

  return (
    [
      ["github_namespace", "githubNamespace"],
      ["github_repository", "githubRepository"],
      ["splitgraphNamespace", "splitgraphNamespace"],
      ["splitgraphRepository", "splitgraphRepository"],
    ] as [string, keyof ImportedRepository][]
  ).reduce((acc, [queryParam, repoKey]) => {
    if (!query[queryParam] || Array.isArray(query[queryParam])) {
      throw new Error(`Invalid query params: unexpected type of ${queryParam}`);
    }

    return {
      ...acc,
      [repoKey]: query[queryParam] as string,
    };
  }, {} as ImportedRepository);
};

const RepositoryAnalyticsPage = () => {
  return (
    <BaseLayout sidebar={<Sidebar />}>
      <Charts importedRepository={useImportedRepoFromURL()} />
    </BaseLayout>
  );
};

export default RepositoryAnalyticsPage;
