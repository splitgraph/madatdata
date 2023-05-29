// components/ImportExportStepper/ExportPanel.tsx

import { useStepper } from "./StepperContext";
import styles from "./ExportPanel.module.css";
import { ExportLoadingBars } from "./ExportLoadingBars";

import { relevantGitHubTableNamesForImport } from "../../lib/config/github-tables";
import { makeQueriesToExport } from "../../lib/config/queries-to-export";
import type {
  ExportQueryInput,
  ExportTableInput,
  StartExportToSeafowlRequestShape,
  StartExportToSeafowlResponseData,
} from "../../pages/api/start-export-to-seafowl";
import { useMemo, useCallback } from "react";

export const ExportPanel = () => {
  const [
    { stepperState, exportError, splitgraphRepository, splitgraphNamespace },
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
      relevantGitHubTableNamesForImport.map((tableName) => ({
        namespace: splitgraphNamespace,
        repository: splitgraphRepository,
        table: tableName,
      })),
    [
      splitgraphNamespace,
      splitgraphRepository,
      relevantGitHubTableNamesForImport,
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

  return (
    <div className={styles.exportPanel}>
      {exportError && <p className={styles.error}>{exportError}</p>}
      {stepperState === "import_complete" && (
        <button
          className={styles.startExportButton}
          onClick={handleStartExport}
        >
          Start Export
        </button>
      )}
      {stepperState === "awaiting_export" && <ExportLoadingBars />}
      {stepperState === "export_complete" && (
        <>
          <button className={styles.querySeafowlButton}>
            Query Seafowl in Splitgraph Console
          </button>
          <button className={styles.viewReportButton}>View Report</button>
        </>
      )}
    </div>
  );
};
