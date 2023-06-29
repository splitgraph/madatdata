import { useEffect } from "react";
import { useStepper } from "./StepperContext";
import { LoadingBar } from "../LoadingBar";

type ImportLoadingBarProps = {
  taskId: string;
  splitgraphNamespace: string;
  splitgraphRepository: string;
  githubNamespace: string;
  githubRepository: string;
};

export const ImportLoadingBar: React.FC<ImportLoadingBarProps> = ({
  taskId,
  splitgraphNamespace,
  splitgraphRepository,
  githubNamespace,
  githubRepository,
}) => {
  const [{ stepperState }, dispatch] = useStepper();

  useEffect(() => {
    if (!taskId || !splitgraphNamespace || !splitgraphRepository) {
      console.log("Don't check import until we have all the right variables");
      console.table({
        taskId: taskId ?? "no task id",
        splitgraphNamespace: splitgraphNamespace ?? "no namespace",
        splitgraphRepository: splitgraphRepository ?? "no repo",
      });
      return;
    }

    if (stepperState !== "awaiting_import") {
      console.log("Done waiting");
      return;
    }

    const checkImportStatus = async () => {
      try {
        const response = await fetch("/api/await-import-from-github", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            taskId,
            splitgraphNamespace,
            splitgraphRepository,
          }),
        });
        const data = await response.json();

        if (data.completed) {
          dispatch({ type: "import_complete" });
        } else if (data.error) {
          dispatch({ type: "import_error", error: data.error });
        }
      } catch (error) {
        dispatch({
          type: "import_error",
          error: "An error occurred during the import process",
        });
      }
    };

    const interval = setInterval(checkImportStatus, 3000);

    return () => clearInterval(interval);
  }, [
    stepperState,
    taskId,
    splitgraphNamespace,
    splitgraphRepository,
    dispatch,
  ]);

  return (
    <div>
      <LoadingBar
        title={
          <div style={{ textAlign: "center" }}>
            <p>
              Importing tables from{" "}
              <a
                href={`https://github.com/${githubNamespace}/${githubRepository}`}
                target="_blank"
              >
                github.com/{`${githubNamespace}/${githubRepository}`}
              </a>
            </p>

            <p>
              into:{" "}
              <a
                href={`https://www.splitgraph.com/${splitgraphNamespace}/${splitgraphRepository}`}
                target="_blank"
              >
                splitgraph.com/
                {`${splitgraphNamespace}/${splitgraphRepository}`}
              </a>
            </p>
          </div>
        }
      >
        <p>
          This might take 5-10 minutes depending on the size of the GitHub
          repository.
        </p>
      </LoadingBar>
    </div>
  );
};
