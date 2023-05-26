// components/ImportExportStepper/ExportPanel.tsx

import { useStepper } from "./StepperContext";
import styles from "./ExportPanel.module.css";
import { ExportLoadingBars } from "./ExportLoadingBars";

import { relevantGitHubTableNames } from "../../lib/config";

export const ExportPanel = () => {
  const [
    { stepperState, exportError, splitgraphRepository, splitgraphNamespace },
    dispatch,
  ] = useStepper();

  const handleStartExport = async () => {
    try {
      const response = await fetch("/api/start-export-to-seafowl", {
        method: "POST",
        body: JSON.stringify({
          tables: relevantGitHubTableNames.map((tableName) => ({
            namespace: splitgraphNamespace,
            repository: splitgraphRepository,
            table: tableName,
          })),
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();

      if (!data.tables || !data.tables.length) {
        throw new Error("Response missing tables");
      }

      dispatch({
        type: "start_export",
        tables: data.tables.map(
          ({ tableName, taskId }: { tableName: string; taskId: string }) => ({
            taskId,
            tableName,
          })
        ),
      });
    } catch (error) {
      dispatch({ type: "export_error", error: error.message });
    }
  };

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
