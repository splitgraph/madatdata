import { useEffect } from "react";
import { useStepper } from "./StepperContext";

type ImportLoadingBarProps = {
  taskId: string;
  splitgraphNamespace: string;
  splitgraphRepository: string;
};

export const ImportLoadingBar: React.FC<ImportLoadingBarProps> = ({
  taskId,
  splitgraphNamespace,
  splitgraphRepository,
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

  return <div>Loading...</div>;
};
