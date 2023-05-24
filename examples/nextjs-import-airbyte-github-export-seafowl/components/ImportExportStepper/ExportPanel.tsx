import styles from "./ExportPanel.module.css";
import { useStepper } from "./StepperContext";

export const ExportPanel = () => {
  const [{ stepperState }] = useStepper();

  const disabled =
    stepperState !== "import_complete" &&
    stepperState !== "awaiting_export" &&
    stepperState !== "export_complete";

  // We will fill this in later

  return (
    <div className={styles.exportPanel}>
      {disabled ? "Export disabled" : "Export..."}
    </div>
  );
};
