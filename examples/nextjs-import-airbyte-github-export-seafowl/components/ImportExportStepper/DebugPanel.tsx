import { useStepper } from "./StepperContext";

export const DebugPanel = () => {
  const [state, _] = useStepper();

  return (
    <div>
      <pre style={{ minWidth: "80%", minHeight: "300px" }}>
        {JSON.stringify(
          state,
          (_key, value) => (value instanceof Set ? Array.from(value) : value),
          2
        )}
      </pre>
    </div>
  );
};
