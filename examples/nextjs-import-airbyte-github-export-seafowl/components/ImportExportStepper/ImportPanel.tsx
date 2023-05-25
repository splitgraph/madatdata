import { useState } from "react";
import { useStepper } from "./StepperContext";
import { ImportLoadingBar } from "./ImportLoadingBar";

import styles from "./ImportPanel.module.css";

export const ImportPanel = () => {
  const [
    {
      stepperState,
      importTaskId,
      importError,
      splitgraphNamespace,
      splitgraphRepository,
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

  return (
    <div className={styles.importPanel}>
      {stepperState === "unstarted" && (
        <>
          {importError && <p className={styles.error}>{importError}</p>}
          <form onSubmit={handleInputSubmit}>
            <input
              type="text"
              placeholder="Enter repository name"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            <button type="submit">Start Import</button>
          </form>
        </>
      )}
      {stepperState === "awaiting_import" && (
        <ImportLoadingBar
          taskId={importTaskId}
          splitgraphNamespace={splitgraphNamespace}
          splitgraphRepository={splitgraphRepository}
        />
      )}
      {stepperState === "import_complete" && (
        <div>
          <p>Import Complete</p>
        </div>
      )}
    </div>
  );
};
