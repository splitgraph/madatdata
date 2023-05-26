import { useStepper } from "./StepperContext";
import { ExportTableLoadingBar } from "./ExportTableLoadingBar";
import styles from "./ExportLoadingBars.module.css";

export const ExportLoadingBars = () => {
  const [{ exportedTablesLoading }] = useStepper();

  return (
    <div className={styles.exportLoadingBars}>
      {Array.from(exportedTablesLoading).map(
        ({ destinationSchema, destinationTable, sourceQuery, taskId }) => (
          <ExportTableLoadingBar
            key={taskId}
            destinationSchema={destinationSchema}
            destinationTable={destinationTable}
            sourceQuery={sourceQuery}
            taskId={taskId}
          />
        )
      )}
    </div>
  );
};
