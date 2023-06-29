import { createContext, useContext } from "react";
import {
  StepperState,
  StepperAction,
  useStepperReducer,
} from "./stepper-states";

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
