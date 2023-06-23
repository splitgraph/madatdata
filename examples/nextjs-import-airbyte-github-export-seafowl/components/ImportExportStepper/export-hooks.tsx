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
  const [
    { stepperState, loadingExportTasks, exportedTablesLoading },
    dispatch,
  ] = useStepper();

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
            onError: async ({ taskId, error }) => {
              // If the task failed but we're not going to retry, then check if
              // there is a fallback query to create the table, and if so,
              // create it before marking the task as complete.
              if (!error.retryable) {
                // NOTE: There is an implicit assumption that `exportedTablesLoading`
                // and `loadingExportTasks` are updated at the same time, which they
                // are, by the reducer that handles the `export_task_start` and
                // `export_task_complete` actions.
                const maybeExportedQueryWithCreateTableFallback = Array.from(
                  exportedTablesLoading
                ).find(
                  (t) => t.taskId === taskId && t.fallbackCreateTableQuery
                );

                if (maybeExportedQueryWithCreateTableFallback) {
                  await createFallbackTableAfterFailedExport({
                    destinationSchema:
                      maybeExportedQueryWithCreateTableFallback.destinationSchema,
                    destinationTable:
                      maybeExportedQueryWithCreateTableFallback.destinationTable,
                    fallbackCreateTableQuery:
                      maybeExportedQueryWithCreateTableFallback.fallbackCreateTableQuery,

                    // On error or success, we mutate the error variable which
                    // will be passed by `dispatch` outside of this conditional.
                    onError: (errorCreatingFallbackTable) => {
                      error.message = `${error.message} (and also error creating fallback: ${errorCreatingFallbackTable.message})`;
                    },
                    onSuccess: () => {
                      error = undefined; // No error because we consider the task complete after creating the fallback table.
                    },
                  });
                }
              }

              dispatch({
                type: "export_task_complete",
                completedTask: {
                  taskId,
                  error,
                },
              });
            },
            abortSignal: abortController.signal,
          })
        )
      );

    const interval = setInterval(pollEachTaskOnce, 3000);
    return () => {
      clearInterval(interval);
      abortController.abort();
    };
  }, [loadingExportTasks, exportedTablesLoading, stepperState, dispatch]);
};

const pollExportTaskOnce = async ({
  taskId,
  onSuccess,
  onError,
  abortSignal,
}: {
  taskId: string;
  onSuccess: ({ taskId }: { taskId: string }) => void;
  onError: ({
    taskId,
    error,
  }: {
    taskId: string;
    error: { message: string; retryable: boolean };
  }) => void;
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
        onError({ taskId, error: { message: data.error, retryable: false } });
      } else {
        throw new Error(data.error);
      }
    }
  } catch (error) {
    if (error.name === "AbortError") {
      return;
    }

    onError({
      taskId,
      error: {
        message: `Error exporting ${taskId}: ${
          error.message ?? error.name ?? "unknown"
        }`,
        retryable: true,
      },
    });
  }
};

/**
 * Call the API route to create a fallback table after a failed export.
 *
 * Note that both `destinationTable` and `destinationSchema` should already
 * be included in the `fallbackCreateTableQuery`, but we need them so that
 * the endpoint can separately `CREATE SCHEMA` and `DROP TABLE` in case the
 * schema does not yet exist, or the table already exists (we overwrite it to
 * be consistent with behavior of Splitgraph export API).
 */
const createFallbackTableAfterFailedExport = async ({
  destinationSchema,
  destinationTable,
  fallbackCreateTableQuery,
  onSuccess,
  onError,
}: Required<
  Pick<
    ExportTable,
    "destinationSchema" | "destinationTable" | "fallbackCreateTableQuery"
  >
> & {
  onSuccess: () => void;
  onError: (error: { message: string }) => void;
}) => {
  try {
    const response = await fetch(
      "/api/create-fallback-table-after-failed-export",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          destinationSchema,
          destinationTable,
          fallbackCreateTableQuery,
        }),
      }
    );
    const data = await response.json();
    if (data.error || !data.success) {
      console.log(
        `FAIL: error from endpoint creating fallback table: ${data.error}`
      );
      onError({ message: data.error ?? "unknown" });
    } else {
      console.log("SUCCESS: created fallback table");
      onSuccess();
    }
  } catch (error) {
    console.log(`FAIL: caught error while creating fallback table: ${error}`);
    onError({
      message: `${error.message ?? error.name ?? "unknown"}`,
    });
  }
};
