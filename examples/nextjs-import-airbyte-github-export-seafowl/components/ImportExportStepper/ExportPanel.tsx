// components/ImportExportStepper/ExportPanel.tsx

import { useStepper } from "./StepperContext";
import styles from "./ExportPanel.module.css";
import { ExportLoadingBars } from "./ExportLoadingBars";

import { splitgraphTablesToExportToSeafowl } from "../../lib/config/github-tables";
import { makeQueriesToExport } from "../../lib/config/queries-to-export";
import type {
  ExportQueryInput,
  ExportTableInput,
  StartExportToSeafowlRequestShape,
  StartExportToSeafowlResponseData,
} from "../../pages/api/start-export-to-seafowl";
import { useMemo, useCallback } from "react";
import { StepTitle } from "./StepTitle";
import { StepDescription } from "./StepDescription";
import {
  SeafowlEmbeddedQuery,
  SeafowlStargazersQueryLink,
} from "../RepositoryAnalytics/ImportedRepoMetadata";
import {
  GitHubRepoLink,
  SplitgraphStargazersQueryLink,
  SplitgraphEmbeddedQuery,
} from "../RepositoryAnalytics/ImportedRepoMetadata";
import { makeStargazersTableQuery } from "../RepositoryAnalytics/sql-queries";

export const ExportPanel = () => {
  const [
    {
      stepperState,
      exportError,
      splitgraphRepository,
      splitgraphNamespace,
      exportedTablesCompleted,
      repository: githubRepositoryFromStepper,
    },
    dispatch,
  ] = useStepper();

  const queriesToExport = useMemo<ExportQueryInput[]>(
    () =>
      makeQueriesToExport({
        splitgraphSourceRepository: splitgraphRepository,
        splitgraphSourceNamespace: splitgraphNamespace,
        seafowlDestinationSchema: `${splitgraphNamespace}/${splitgraphRepository}`,
      }),
    [splitgraphRepository, splitgraphNamespace]
  );

  const tablesToExport = useMemo<ExportTableInput[]>(
    () =>
      splitgraphTablesToExportToSeafowl.map((tableName) => ({
        namespace: splitgraphNamespace,
        repository: splitgraphRepository,
        table: tableName,
      })),
    [
      splitgraphNamespace,
      splitgraphRepository,
      splitgraphTablesToExportToSeafowl,
    ]
  );

  const handleStartExport = useCallback(async () => {
    const abortController = new AbortController();

    try {
      const response = await fetch("/api/start-export-to-seafowl", {
        method: "POST",
        body: JSON.stringify({
          tables: tablesToExport,
          queries: queriesToExport,
        } as StartExportToSeafowlRequestShape),
        headers: {
          "Content-Type": "application/json",
        },
        signal: abortController.signal,
      });
      const data = (await response.json()) as StartExportToSeafowlResponseData;

      if ("error" in data && data["error"]) {
        throw new Error(data["error"]);
      }

      if (!("tables" in data) || !("queries" in data)) {
        throw new Error("Response missing tables");
      }

      dispatch({
        type: "start_export",
        tables: [
          ...data["queries"].map(
            ({ sourceQuery, taskId, destinationSchema, destinationTable }) => ({
              taskId,
              destinationTable,
              destinationSchema,
              sourceQuery,
            })
          ),
          ...data["tables"].map(
            ({ destinationTable, destinationSchema, taskId }) => ({
              taskId,
              destinationTable,
              destinationSchema,
            })
          ),
        ],
      });
    } catch (error) {
      if (error.name === "AbortError") {
        return;
      }

      dispatch({ type: "export_error", error: error.message });
    }

    return () => abortController.abort();
  }, [queriesToExport, tablesToExport, dispatch]);

  const stepStatus = (() => {
    switch (stepperState) {
      case "import_complete":
        return "active";
      case "awaiting_export":
        return "loading";
      case "export_complete":
        return "completed";
      default:
        return "unstarted";
    }
  })();

  return (
    <div className={styles.exportPanel}>
      <StepTitle
        stepNumber={2}
        stepTitle={"Export Data from Splitgraph to Seafowl"}
        status={stepStatus}
      />
      <StepDescription status={stepStatus}>
        {stepStatus === "completed" ? (
          <div className={styles.exportCompleteInfo}>
            <p>
              &#10003; Export complete! We successfully imported tables and
              queries from Splitgraph to our{" "}
              <a href="https://seafowl.io" target="_blank">
                Seafowl
              </a>{" "}
              instance running at <code>https://demo.seafowl.cloud</code>. Now
              we can query it and get cache-optimized responses for rendering
              charts and analytics.
            </p>
            <p>
              <strong>Query Data: </strong>&nbsp;
              <SeafowlStargazersQueryLink
                splitgraphNamespace={splitgraphNamespace}
                splitgraphRepository={splitgraphRepository}
              />
            </p>
            <SeafowlEmbeddedQuery
              importedRepository={{ splitgraphNamespace, splitgraphRepository }}
              tableName={"stargazers"}
              makeQuery={makeStargazersTableQuery}
            />
          </div>
        ) : (
          <div className={styles.exportInfo}>
            Now let's export some tables and pre-made queries from our staging
            area in Splitgraph to our cache-optimized{" "}
            <a href="https://seafowl.io" target="_blank">
              Seafowl
            </a>{" "}
            instance running at <code>https://demo.seafowl.cloud</code>.{" "}
            {stepStatus === "active" && (
              <> Click the button to start the export.</>
            )}
          </div>
        )}
      </StepDescription>
      {exportError && <p className={styles.error}>{exportError}</p>}
      {stepperState === "import_complete" && (
        <button
          className={styles.startExportButton}
          onClick={handleStartExport}
        >
          Start Export of Tables and Queries from Splitgraph to Seafowl
        </button>
      )}
      {stepperState === "awaiting_export" && <ExportLoadingBars />}
    </div>
  );
};
