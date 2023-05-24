import { StepperContextProvider } from "./StepperContext";
import { ImportPanel } from "./ImportPanel"; // will create this component later
import { ExportPanel } from "./ExportPanel"; // will create this component later

import styles from "./Stepper.module.css";

export const Stepper = () => {
  return (
    <StepperContextProvider>
      <div className={styles.stepper}>
        <ImportPanel />
        <ExportPanel />
      </div>
    </StepperContextProvider>
  );
};
