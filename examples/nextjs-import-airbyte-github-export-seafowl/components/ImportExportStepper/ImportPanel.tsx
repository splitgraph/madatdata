import { useState } from "react";
import { useStepper } from "./StepperContext";
import { ImportLoadingBar } from "./ImportLoadingBar";
import { StepTitle } from "./StepTitle";

import styles from "./ImportPanel.module.css";
import { StepDescription } from "./StepDescription";
import {
  GitHubRepoLink,
  SplitgraphStargazersQueryLink,
} from "../RepositoryAnalytics/ImportedRepoMetadata";

export const ImportPanel = () => {
  const [
    {
      stepperState,
      importTaskId,
      importError,
      splitgraphNamespace,
      splitgraphRepository,
      repository: githubRepositoryFromStepper,
    },
    dispatch,
  ] = useStepper();
  const [inputValue, setInputValue] = useState("");

  const handleInputSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidRepoName(inputValue)) {
      dispatch({
        type: "import_error",
        error:
          "Invalid GitHub repository name. Format must be 'namespace/repository'",
      });
      return;
    }

    const [githubNamespace, githubRepository] = inputValue.split("/");

    try {
      const response = await fetch(`/api/start-import-from-github`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ githubSourceRepository: inputValue }),
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();

      if (!data.taskId) {
        throw new Error("Response missing taskId");
      }

      if (!data.destination || !data.destination.splitgraphNamespace) {
        throw new Error("Response missing destination.splitgraphNamespace");
      }

      if (!data.destination || !data.destination.splitgraphRepository) {
        throw new Error("Response missing destination.splitgraphRepository");
      }

      dispatch({
        type: "start_import",
        repository: {
          namespace: githubNamespace,
          repository: githubRepository,
        },
        taskId: data.taskId,
        splitgraphRepository: data.destination.splitgraphRepository as string,
        splitgraphNamespace: data.destination.splitgraphNamespace as string,
      });
    } catch (error) {
      dispatch({ type: "import_error", error: error.message });
    }
  };

  const isValidRepoName = (repoName: string) => {
    // A valid GitHub repo name should contain exactly one '/'
    return /^[\w-.]+\/[\w-.]+$/.test(repoName);
  };

  const stepStatus: React.ComponentProps<typeof StepTitle>["status"] = (() => {
    switch (stepperState) {
      case "import_complete":
      case "awaiting_export":
      case "export_complete":
        return "completed";
      case "awaiting_import":
        return "loading";
      default:
        return "active";
    }
  })();

  return (
    <div className={styles.importPanel}>
      <StepTitle
        stepTitle="Import GitHub repository data to Splitgraph"
        stepNumber={1}
        status={stepStatus}
      />
      <StepDescription status={stepStatus}>
        {stepStatus === "completed" ? (
          <div className={styles.importCompleteInfo}>
            <p>
              &#10003; Import complete! We successfully imported data from{" "}
              <GitHubRepoLink
                githubNamespace={githubRepositoryFromStepper.namespace}
                githubRepository={githubRepositoryFromStepper.repository}
              />{" "}
              into Splitgraph.
            </p>
            <p>
              <strong>Browse Data:</strong>{" "}
              <a
                href={`https://www.splitgraph.com/${splitgraphNamespace}/${splitgraphRepository}`}
                target="_blank"
              >
                splitgraph.com/
                {`${splitgraphNamespace}/${splitgraphRepository}`}
              </a>
            </p>
            <p>
              <strong>Query Data:</strong>
              {"  "}&nbsp;
              <SplitgraphStargazersQueryLink
                splitgraphNamespace={splitgraphNamespace}
                splitgraphRepository={splitgraphRepository}
              />
            </p>
          </div>
        ) : (
          <>
            We'll use the{" "}
            <a
              href="https://www.splitgraph.com/connect/data/github"
              target="_blank"
            >
              airbyte-github
            </a>{" "}
            plugin to import data about this GitHub repository into the
            Splitgraph Data Delivery Network (DDN). Then you'll be able to
            browse the data in the Splitgraph catalog, or query it with{" "}
            <a href="https://www.splitgraph.com/connect/query" target="_blank">
              your favorite Postgres Client
            </a>{" "}
            or with the{" "}
            <a href="https://www.splitgraph.com/query" target="_blank">
              Splitgraph Query Console
            </a>
            .
          </>
        )}
      </StepDescription>
      {stepperState === "unstarted" && (
        <>
          {importError && <p className={styles.error}>{importError}</p>}
          <form onSubmit={handleInputSubmit} className={styles.repoNameForm}>
            <input
              type="text"
              placeholder="GitHub repository name, e.g. splitgraph/seafowl"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className={styles.repoNameInput}
              tabIndex={1}
              autoFocus={true}
            />
            <button type="submit" className={styles.startImportButton}>
              Start Import
            </button>
          </form>
        </>
      )}
      {stepperState === "awaiting_import" && (
        <ImportLoadingBar
          taskId={importTaskId}
          splitgraphNamespace={splitgraphNamespace}
          splitgraphRepository={splitgraphRepository}
          githubNamespace={
            githubRepositoryFromStepper.namespace ?? inputValue.split("/")[0]
          }
          githubRepository={
            githubRepositoryFromStepper.repository ?? inputValue.split("/")[1]
          }
        />
      )}
    </div>
  );
};
