import { useStepper } from "./StepperContext";

export const DebugPanel = () => {
  const [state, _] = useStepper();

  return (
    <div>
      <pre style={{ minWidth: "80%", minHeight: "300px" }}>
        {JSON.stringify(state, null, 2)}
      </pre>
    </div>
  );
};
