import { BaseLayout } from "../../components/BaseLayout";

import { Sidebar } from "../../components/Sidebar";
import { Charts } from "../../components/RepositoryAnalytics/Charts";
import { useRouter } from "next/router";

import type { ImportedRepository } from "../../types";

import { ImportedRepoMetadata } from "../../components/RepositoryAnalytics/ImportedRepoMetadata";
import { useCallback, useMemo } from "react";

import {
  EmbeddedQueryPreviews,
  EmbeddedTablePreviews,
  EmbeddedQueryPreviewHeadingAndDescription,
  EmbeddedTablePreviewHeadingAndDescription,
} from "../../components/EmbeddedQuery/EmbeddedPreviews";

import { useQueriesToExport } from "../../lib/config/queries-to-export";
import { useTablesToExport } from "../../lib/config/github-tables";
import { getQueryParamAsString } from "../../lib/util";
import { TabButton } from "../../components/EmbeddedQuery/TabButton";

type ActiveTab = "charts" | "tables" | "queries";

const useActiveTab = (defaultTab: ActiveTab) => {
  const router = useRouter();

  const activeTab =
    getQueryParamAsString<ActiveTab>(router.query, "activeTab") ?? defaultTab;

  const switchTab = useCallback(
    (nextTab: ActiveTab) => {
      if (nextTab === activeTab) {
        return;
      }

      return router.push({
        pathname: router.pathname,
        query: {
          ...router.query,
          activeTab: nextTab,
        },
      });
    },
    [router.query]
  );

  return {
    activeTab,
    switchTab,
  };
};

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

  const tablesToExport = useTablesToExport(importedRepository);
  const queriesToExport = useQueriesToExport(importedRepository);

  const { activeTab, switchTab } = useActiveTab("charts");

  return (
    <BaseLayout sidebar={<Sidebar />}>
      <ImportedRepoMetadata importedRepository={importedRepository} />
      <PageTabs activeTab={activeTab} switchTab={switchTab} />

      <TabPane active={activeTab === "charts"}>
        <Charts importedRepository={importedRepository} />
      </TabPane>

      <TabPane active={activeTab === "tables"}>
        <EmbeddedTablePreviewHeadingAndDescription exportComplete={true} />
        <EmbeddedTablePreviews
          useLoadingOrCompleted={() => ({ loading: false, completed: true })}
          tablesToExport={tablesToExport}
          splitgraphRepository={importedRepository.splitgraphRepository}
          splitgraphNamespace={importedRepository.splitgraphNamespace}
        />
      </TabPane>

      <TabPane active={activeTab === "queries"}>
        <EmbeddedQueryPreviewHeadingAndDescription exportComplete={true} />
        <EmbeddedQueryPreviews
          useLoadingOrCompleted={() => ({ loading: false, completed: true })}
          queriesToExport={queriesToExport}
          splitgraphRepository={importedRepository.splitgraphRepository}
          splitgraphNamespace={importedRepository.splitgraphNamespace}
        />
      </TabPane>
    </BaseLayout>
  );
};

const TabPane = ({ active, children }: { active: boolean; children: any }) => {
  return <div style={{ display: active ? "block" : "none" }}>{children}</div>;
};

const PageTabs = ({
  activeTab,
  switchTab,
}: ReturnType<typeof useActiveTab>) => {
  return (
    <div>
      <TabButton
        active={activeTab === "charts"}
        onClick={() => switchTab("charts")}
        style={{ marginRight: "1rem" }}
        size="1.5rem"
      >
        Charts
      </TabButton>
      <TabButton
        active={activeTab === "tables"}
        onClick={() => switchTab("tables")}
        style={{ marginRight: "1rem" }}
        size="1.5rem"
      >
        Raw Tables
      </TabButton>
      <TabButton
        active={activeTab === "queries"}
        onClick={() => switchTab("queries")}
        style={{ marginRight: "1rem" }}
        size="1.5rem"
      >
        Raw Queries
      </TabButton>
    </div>
  );
};

export default RepositoryAnalyticsPage;
