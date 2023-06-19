// components/ImportExportStepper/ExportPanel.tsx

import { ComponentProps, Fragment, useState } from "react";

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
  type EmbeddedQueryProps,
  SeafowlEmbeddedQuery,
  SeafowlStargazersQueryLink,
} from "../RepositoryAnalytics/ImportedRepoMetadata";
import {
  GitHubRepoLink,
  SplitgraphStargazersQueryLink,
  SplitgraphEmbeddedQuery,
} from "../RepositoryAnalytics/ImportedRepoMetadata";
import { makeStargazersTableQuery } from "../RepositoryAnalytics/sql-queries";
import type { ExportTable } from "./stepper-states";

import type { TargetSplitgraphRepo } from "../../types";

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
      {["import_complete", "awaiting_export", "export_complete"].includes(
        stepperState
      ) && (
        <ExportPreview
          handleStartExport={handleStartExport}
          tablesToExport={tablesToExport}
          queriesToExport={queriesToExport}
          splitgraphRepository={splitgraphRepository}
          splitgraphNamespace={splitgraphNamespace}
        />
      )}
      {stepperState === "awaiting_export" && <ExportLoadingBars />}
    </div>
  );
};

const ExportPreview = ({
  handleStartExport,
  tablesToExport,
  queriesToExport,
  splitgraphRepository,
  splitgraphNamespace,
}: {
  handleStartExport: () => Promise<() => void>;
  tablesToExport: ExportTableInput[];
  queriesToExport: ExportQueryInput[];
  splitgraphRepository: string;
  splitgraphNamespace: string;
}) => {
  return (
    <>
      <button className={styles.startExportButton} onClick={handleStartExport}>
        Start Export of Tables and Queries from Splitgraph to Seafowl
      </button>
      <h3>Tables to Export</h3>
      {tablesToExport
        .filter((_) => true)
        .map((exportTable) => (
          <ExportEmbedPreviewTableOrQuery
            key={`export-table-preview-${exportTable.table}`}
            exportInput={exportTable}
            importedRepository={{ splitgraphNamespace, splitgraphRepository }}
            makeQuery={({ splitgraphNamespace, splitgraphRepository, table }) =>
              `SELECT * FROM "${splitgraphNamespace}/${splitgraphRepository}"."${table}";`
            }
            makeMatchInputToExported={(exportTableInput) => (exportTable) => {
              return (
                exportTable.destinationSchema === exportTableInput.repository &&
                exportTable.destinationTable === exportTableInput.table
              );
            }}
          />
        ))}

      <h3>Queries to Export</h3>
      {queriesToExport
        .filter((_) => true)
        .map((exportQuery) => (
          <ExportEmbedPreviewTableOrQuery
            key={`export-query-preview-${exportQuery.destinationTable}-${exportQuery.destinationSchema}`}
            exportInput={exportQuery}
            importedRepository={{ splitgraphNamespace, splitgraphRepository }}
            makeQuery={({ sourceQuery }) => sourceQuery}
            makeMatchInputToExported={(exportQueryInput) =>
              (exportTable: ExportTable) => {
                return (
                  exportTable.destinationSchema ===
                    exportQueryInput.destinationSchema &&
                  exportTable.destinationTable ===
                    exportQueryInput.destinationTable
                );
              }}
          />
        ))}
    </>
  );
};

const useFindMatchingExportTable = (
  isMatch: (candidateTable: ExportTable) => boolean
) => {
  const [{ exportedTablesLoading, exportedTablesCompleted }] = useStepper();

  const matchingCompletedTable = useMemo(
    () => Array.from(exportedTablesCompleted).find(isMatch),
    [exportedTablesCompleted, isMatch]
  );
  const matchingLoadingTable = useMemo(
    () => Array.from(exportedTablesLoading).find(isMatch),
    [exportedTablesLoading, isMatch]
  );

  const completed = matchingCompletedTable ?? false;
  const loading = matchingLoadingTable ?? false;
  const unstarted = !completed && !loading;

  return {
    completed,
    loading,
    unstarted,
  };
};

const ExportEmbedPreviewTableOrQuery = <
  ExportInputShape extends ExportQueryInput | ExportTableInput
>({
  importedRepository,
  exportInput,
  makeQuery,
  makeMatchInputToExported,
}: {
  exportInput: ExportInputShape;
  makeQuery: (
    tableOrQueryInput: ExportInputShape & {
      splitgraphNamespace: string;
      splitgraphRepository: string;
    }
  ) => string;
  makeMatchInputToExported: (
    tableOrQueryInput: ExportInputShape
  ) => (exported: ExportTable) => boolean;
  importedRepository: {
    splitgraphNamespace: string;
    splitgraphRepository: string;
  };
}) => {
  const embedProps = {
    importedRepository,
    tableName:
      "destinationTable" in exportInput
        ? exportInput.destinationTable
        : exportInput.table,
    makeQuery: () => makeQuery({ ...exportInput, ...importedRepository }),
  };

  const { unstarted, loading, completed } = useFindMatchingExportTable(
    makeMatchInputToExported(exportInput)
  );

  const heading =
    "table" in exportInput
      ? exportInput.table
      : `${exportInput.destinationSchema}.${exportInput.destinationTable}`;

  const [selectedTab, setSelectedTab] = useState<"splitgraph" | "seafowl">(
    "splitgraph"
  );

  return (
    <>
      <h4>
        <code>{heading}</code>
      </h4>
      <div style={{ display: "flex", flexDirection: "row" }}>
        <button
          onClick={() => setSelectedTab("splitgraph")}
          disabled={selectedTab === "splitgraph"}
          style={{ marginRight: "1rem" }}
        >
          Splitgraph Query
        </button>
        <button
          onClick={() => setSelectedTab("seafowl")}
          disabled={selectedTab === "seafowl" || !completed}
        >
          Seafowl Query
        </button>
      </div>
      <pre>{JSON.stringify({ completed, loading }, null, 2)}</pre>
      {
        <div
          style={{
            visibility: selectedTab === "splitgraph" ? "visible" : "hidden",
            display: selectedTab === "seafowl" ? "none" : "block",
          }}
        >
          <SplitgraphEmbeddedQuery {...embedProps} />
        </div>
      }
      {completed && (
        <div
          style={{
            visibility: selectedTab === "seafowl" ? "visible" : "hidden",
            display: selectedTab === "splitgraph" ? "none" : "block",
          }}
        >
          <SeafowlEmbeddedQuery {...embedProps} />
        </div>
      )}
    </>
  );
};
