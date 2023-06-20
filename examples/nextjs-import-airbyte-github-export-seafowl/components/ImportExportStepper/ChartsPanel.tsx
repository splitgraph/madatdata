import { Charts } from "../RepositoryAnalytics/Charts";
import { StepDescription } from "./StepDescription";
import { StepTitle } from "./StepTitle";
import { useStepper } from "./StepperContext";

export const ChartsPanel = () => {
  const [
    {
      repository: { namespace: githubNamespace, repository: githubRepository },
      splitgraphNamespace,
      splitgraphRepository,
      stepperState,
    },
  ] = useStepper();

  const stepStatus = (() => {
    switch (stepperState) {
      case "export_complete":
        return "active";
      default:
        return "unstarted";
    }
  })();

  return (
    <div>
      <StepTitle
        status={stepStatus}
        stepNumber={3}
        stepTitle="Render charts with Observable Plot"
      />
      <StepDescription status={stepStatus}>
        Once the data is loaded into Seafowl, we can query it with{" "}
        <a href="https://www.github.com/splitgraph/madatdata" target="_blank">
          madatdata
        </a>{" "}
        and render some charts using{" "}
        <a href="https://observablehq.com/plot/" target="_blank">
          Observable Plot
        </a>
        .
      </StepDescription>
      {stepStatus === "active" && (
        <Charts
          importedRepository={{
            githubNamespace,
            githubRepository,
            splitgraphNamespace,
            splitgraphRepository,
          }}
        />
      )}
    </div>
  );
};
