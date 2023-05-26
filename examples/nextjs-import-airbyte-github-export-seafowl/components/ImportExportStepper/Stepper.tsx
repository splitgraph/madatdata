import { StepperContextProvider, useStepper } from "./StepperContext";
import { DebugPanel } from "./DebugPanel";
import { ImportPanel } from "./ImportPanel";
import { ExportPanel } from "./ExportPanel";

import styles from "./Stepper.module.css";

const StepperOrLoading = ({ children }: { children: React.ReactNode }) => {
  const [{ stepperState }] = useStepper();

  return (
    <>{stepperState === "uninitialized" ? <div>........</div> : children}</>
  );
};

export const Stepper = () => {
  return (
    <StepperContextProvider>
      <div className={styles.stepper}>
        <StepperOrLoading>
          <DebugPanel />
          <ImportPanel />
          <ExportPanel />
        </StepperOrLoading>
      </div>
    </StepperContextProvider>
  );
};
