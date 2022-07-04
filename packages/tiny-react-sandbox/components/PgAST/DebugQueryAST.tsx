import { SplitPaneInputOutput } from "../debugging/SplitPaneInputOutput";

export const DebugQueryAST = () => {
  return (
    <SplitPaneInputOutput
      makeOutput={(inputValue) => {
        return inputValue;
      }}
      renderOutputToString={(output) => {
        return (
          typeof output === "object" && output?.toString
            ? output.toString()
            : output
        ) as string;
      }}
      fetchOutput={async (inputValue) => {
        return new Promise((resolve, _reject) => {
          setTimeout(
            () => resolve(new Date().toString() + "\n" + inputValue),
            2000
          );
        });
      }}
    />
  );
};
