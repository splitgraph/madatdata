import { useStepper } from "./StepperContext";

export const DebugPanel = () => {
  const [state, _] = useStepper();

  return (
    <div>
      <pre style={{ minWidth: "80%", minHeight: "300px" }}>
        {JSON.stringify(
          state,
          (_key, value) => {
            if (value instanceof Set) {
              return Array.from(value);
            } else if (value instanceof Map) {
              return Object.fromEntries(value);
            } else {
              return value;
            }
          },
          2
        )}
      </pre>
    </div>
  );
};
