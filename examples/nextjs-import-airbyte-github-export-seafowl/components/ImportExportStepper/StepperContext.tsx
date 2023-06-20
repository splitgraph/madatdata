import { createContext, useContext, useMemo } from "react";
import {
  StepperState,
  StepperAction,
  useStepperReducer,
} from "./stepper-states";
import type { ExportTable } from "./stepper-states";

// Define the context
const StepperContext = createContext<
  [StepperState, React.Dispatch<StepperAction>] | undefined
>(undefined);

export const StepperContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [state, dispatch] = useStepperReducer();

  return (
    <StepperContext.Provider value={[state, dispatch]}>
      {children}
    </StepperContext.Provider>
  );
};

// Custom hook for using the stepper context
export const useStepper = () => {
  const context = useContext(StepperContext);
  if (!context) {
    throw new Error("useStepper must be used within a StepperContextProvider");
  }
  return context;
};

export const useStepperDebug = () => useStepper()[0].debug;

/**
 * Given a function to match a candidate `ExportTable` to (presumably) an `ExportTableInput`,
 * determine if the table (which could also be a query - it's keyed by `destinationSchema`
 * and `destinationTable`) is currently exporting (`loading`) or has exported (`completed`).
 *
 * Return `{ loading, completed, unstarted }`, where:
 *
 * * `loading` is `true` if there is a match in the `exportedTablesLoading` set,
 * * `completed` is `true` if there is a match in the `exportedTablesCompleted` set
 *    (or if `stepperState` is `export_complete`),
 * * `unstarted` is `true` if there is no match in either set.
 *
 */
export const useFindMatchingExportTable = (
  isMatch: (candidateTable: ExportTable) => boolean
) => {
  const [{ stepperState, exportedTablesLoading, exportedTablesCompleted }] =
    useStepper();

  const matchingCompletedTable = useMemo(
    () => Array.from(exportedTablesCompleted).find(isMatch),
    [exportedTablesCompleted, isMatch]
  );
  const matchingLoadingTable = useMemo(
    () => Array.from(exportedTablesLoading).find(isMatch),
    [exportedTablesLoading, isMatch]
  );

  // If the state is export_complete, we might have loaded the page directly
  // and thus we don't have the sets of exportedTablesCompleted, but we know they exist
  const exportFullyCompleted = stepperState === "export_complete";

  const completed = matchingCompletedTable ?? (exportFullyCompleted || false);
  const loading = matchingLoadingTable ?? false;
  const unstarted = !completed && !loading;

  return {
    completed,
    loading,
    unstarted,
  };
};
