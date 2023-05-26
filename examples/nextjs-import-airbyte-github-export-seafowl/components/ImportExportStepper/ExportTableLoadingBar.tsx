import { useEffect } from "react";
import { useStepper } from "./StepperContext";
import styles from "./ExportTableLoadingBar.module.css";

interface ExportTableLoadingBarProps {
  destinationTable: string;
  destinationSchema: string;
  sourceQuery?: string;
  taskId: string;
}

export const ExportTableLoadingBar = ({
  destinationTable,
  destinationSchema,
  sourceQuery,
  taskId,
}: React.PropsWithoutRef<ExportTableLoadingBarProps>) => {
  const [{ stepperState, exportedTablesLoading }, dispatch] = useStepper();

  useEffect(() => {
    if (!taskId || !destinationTable) {
      console.log(
        "Don't check export until we have taskId and destinationTable"
      );
      console.table({
        taskId,
        destinationTable,
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
            completedTable: {
              destinationTable,
              taskId,
              destinationSchema,
              sourceQuery,
            },
          });
        } else if (data.error) {
          if (!data.completed) {
            console.log("WARN: Failed status, not completed:", data.error);
          } else {
            throw new Error(data.error);
          }
        }
      } catch (error) {
        dispatch({
          type: "export_error",
          error: `Error exporting ${destinationTable}: ${error.message}`,
        });
      }
    };

    const interval = setInterval(pollExportTask, 3000);
    return () => clearInterval(interval);
  }, [stepperState, destinationTable, taskId, dispatch]);

  const isLoading = !!Array.from(exportedTablesLoading).find(
    (t) => t.taskId === taskId
  );

  return (
    <div className={styles.exportTableLoadingBar}>
      <div className={styles.loadingBar}>
        {isLoading
          ? `Loading ${destinationTable}...`
          : `Successfully exported ${destinationTable}`}
      </div>
      <div className={styles.destinationTable}>{destinationTable}</div>
    </div>
  );
};
