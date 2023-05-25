import { useStepper } from "./StepperContext";
import { ExportTableLoadingBar } from "./ExportTableLoadingBar";
import styles from "./ExportLoadingBars.module.css";

export const ExportLoadingBars = () => {
  const [{ exportedTablesLoading }] = useStepper();

  return (
    <div className={styles.exportLoadingBars}>
      {Array.from(exportedTablesLoading).map(({ tableName, taskId }) => (
        <ExportTableLoadingBar
          key={taskId}
          tableName={tableName}
          taskId={taskId}
        />
      ))}
    </div>
  );
};
