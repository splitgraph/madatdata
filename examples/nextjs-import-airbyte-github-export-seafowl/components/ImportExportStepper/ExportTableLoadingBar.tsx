import { useEffect } from "react";
import { useStepper } from "./StepperContext";
import styles from "./ExportTableLoadingBar.module.css";

interface ExportTableLoadingBarProps {
  tableName: string;
  taskId: string;
}

export const ExportTableLoadingBar = ({
  tableName,
  taskId,
}: React.PropsWithoutRef<ExportTableLoadingBarProps>) => {
  const [{ stepperState, exportedTablesLoading }, dispatch] = useStepper();

  useEffect(() => {
    if (!taskId || !tableName) {
      console.log("Don't check export until we have taskId and tableName");
      console.table({
        taskId,
        tableName,
      });
      return;
    }

    if (stepperState !== "awaiting_export") {
      console.log("Done waiting for export");
      return;
    }

    const pollExportTask = async () => {
      try {
        const response = await fetch("/api/await-export-to-seafowl-task", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            taskId,
          }),
        });
        const data = await response.json();

        if (data.completed) {
          dispatch({
            type: "export_table_task_complete",
            completedTable: { tableName, taskId },
          });
        } else if (data.error) {
          throw new Error(data.error);
        }
      } catch (error) {
        dispatch({
          type: "export_error",
          error: `Error exporting ${tableName}: ${error.message}`,
        });
      }
    };

    const interval = setInterval(pollExportTask, 3000);
    return () => clearInterval(interval);
  }, [stepperState, tableName, taskId, dispatch]);

  const isLoading = !!Array.from(exportedTablesLoading).find(
    (t) => t.taskId === taskId
  );

  return (
    <div className={styles.exportTableLoadingBar}>
      <div className={styles.loadingBar}>
        {isLoading
          ? `Loading ${tableName}...`
          : `Successfully exported ${tableName}`}
      </div>
      <div className={styles.tableName}>{tableName}</div>
    </div>
  );
};
