// StepperContext.tsx
import React, { useReducer, useContext, ReactNode } from "react";
import {
  StepperState,
  StepperAction,
  useStepperReducer,
} from "./stepper-states";

// Define the context
const StepperContext = React.createContext<
  [StepperState, React.Dispatch<StepperAction>] | undefined
>(undefined);

export const StepperContextProvider: React.FC<{ children: ReactNode }> = ({
  children,
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
