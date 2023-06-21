import { useEffect, useMemo } from "react";
import type { ExportTable } from "./stepper-states";
import { useStepper } from "./StepperContext";

/**
 * Given a function to match a candidate `ExportTable` to (presumably) an `ExportTableInput`,
 * determine if the table (which could also be a query - it's keyed by `destinationSchema`
 * and `destinationTable`) is currently exporting (`loading`) or has exported (`completed`).
 *
 * Return `{ loading, completed, unstarted }`, where:
 *
 * * `loading` is `true` if there is a match in the `exportedTablesLoading` set,
 * * `completed` is `true` if there is a match in the `exportedTablesCompleted` set
 *    (or if `stepperState` is `export_complete`),
 * * `unstarted` is `true` if there is no match in either set.
 *
 */
export const useFindMatchingExportTable = (
  isMatch: (candidateTable: ExportTable) => boolean
) => {
  const [{ stepperState, exportedTablesLoading, exportedTablesCompleted }] =
    useStepper();

  const matchingCompletedTable = useMemo(
    () => Array.from(exportedTablesCompleted).find(isMatch),
    [exportedTablesCompleted, isMatch]
  );
  const matchingLoadingTable = useMemo(
    () => Array.from(exportedTablesLoading).find(isMatch),
    [exportedTablesLoading, isMatch]
  );

  // If the state is export_complete, we might have loaded the page directly
  // and thus we don't have the sets of exportedTablesCompleted, but we know they exist
  const exportFullyCompleted = stepperState === "export_complete";

  const completed = matchingCompletedTable ?? (exportFullyCompleted || false);
  const loading = matchingLoadingTable ?? false;
  const unstarted = !completed && !loading;

  return {
    completed,
    loading,
    unstarted,
  };
};

export const usePollExportTasks = () => {
  const [{ stepperState, loadingExportTasks }, dispatch] = useStepper();

  useEffect(() => {
    if (stepperState !== "awaiting_export") {
      return;
    }

    const taskIds = Array.from(loadingExportTasks).map(({ taskId }) => taskId);

    if (taskIds.length === 0) {
      return;
    }

    const abortController = new AbortController();

    const pollEachTaskOnce = () =>
      Promise.all(
        taskIds.map((taskId) =>
          pollExportTaskOnce({
            taskId,
            onSuccess: ({ taskId }) =>
              dispatch({
                type: "export_task_complete",
                completedTask: { taskId },
              }),
            onError: ({ taskId, error }) =>
              dispatch({
                type: "export_error",
                error: `Error exporting ${taskId}: ${error.message}`,
              }),
            abortSignal: abortController.signal,
          })
        )
      );

    const interval = setInterval(pollEachTaskOnce, 3000);
    return () => {
      clearInterval(interval);
      abortController.abort();
    };
  }, [loadingExportTasks, stepperState, dispatch]);
};

const pollExportTaskOnce = async ({
  taskId,
  onSuccess,
  onError,
  abortSignal,
}: {
  taskId: string;
  onSuccess: ({ taskId }: { taskId: string }) => void;
  onError: ({ taskId, error }: { taskId: string; error: any }) => void;
  abortSignal: AbortSignal;
}) => {
  try {
    const response = await fetch("/api/await-export-to-seafowl-task", {
      signal: abortSignal,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        taskId,
      }),
    });
    const data = await response.json();

    if (data.completed) {
      onSuccess({ taskId });
    } else if (data.error) {
      if (!data.completed) {
        console.log("WARN: Failed status, not completed:", data.error);
      } else {
        throw new Error(data.error);
      }
    }
  } catch (error) {
    if (error.name === "AbortError") {
      return;
    }

    onError({ taskId, error });
  }
};
