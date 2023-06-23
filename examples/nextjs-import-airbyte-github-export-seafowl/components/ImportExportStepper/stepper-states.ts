import { useRouter, type NextRouter } from "next/router";
import { ParsedUrlQuery } from "querystring";
import { useEffect, useReducer } from "react";
export type GitHubRepository = { namespace: string; repository: string };

export type ExportTable = {
  destinationSchema: string;
  destinationTable: string;
  taskId: string;
  sourceQuery?: string;
  fallbackCreateTableQuery?: string;
};

// NOTE: Multiple tables can have the same taskId, so we track them separately
// in order to not need to redundantly poll the API for each table individually
export type ExportTask = {
  taskId: string;
  error?: { message: string; retryable: boolean };
};

export type StepperState = {
  stepperState:
    | "uninitialized"
    | "unstarted"
    | "awaiting_import"
    | "import_complete"
    | "awaiting_export"
    | "export_complete";
  repository?: GitHubRepository | null;
  importTaskId?: string | null;
  importError?: string;
  splitgraphRepository?: string;
  splitgraphNamespace?: string;
  exportedTablesLoading?: Set<ExportTable>;
  exportedTablesCompleted?: Set<ExportTable>;
  exportError?: string;
  debug?: string | null;
  loadingExportTasks?: Set<ExportTask>;
  completedExportTasks?: Set<ExportTask>;
  tasksWithError?: Map<string, string[]>; // taskId -> errors
};

export type StepperAction =
  | {
      type: "start_import";
      repository: GitHubRepository;
      taskId: string;
      splitgraphRepository: string;
      splitgraphNamespace: string;
    }
  | { type: "import_complete" }
  | { type: "start_export"; tables: ExportTable[] }
  | { type: "export_table_task_complete"; completedTable: ExportTable }
  | { type: "export_task_complete"; completedTask: ExportTask }
  | { type: "export_complete" }
  | { type: "export_error"; error: string }
  | { type: "import_error"; error: string }
  | { type: "reset" }
  | { type: "initialize_from_url"; parsedFromUrl: StepperState };

const initialState: StepperState = {
  stepperState: "unstarted",
  repository: null,
  splitgraphRepository: null,
  splitgraphNamespace: null,
  importTaskId: null,
  exportedTablesLoading: new Set<ExportTable>(),
  exportedTablesCompleted: new Set<ExportTable>(),
  loadingExportTasks: new Set<ExportTask>(),
  completedExportTasks: new Set<ExportTask>(),
  tasksWithError: new Map<string, string[]>(),
  importError: null,
  exportError: null,
  debug: null,
};

const getQueryParamAsString = <T extends string = string>(
  query: ParsedUrlQuery,
  key: string
): T | null => {
  if (Array.isArray(query[key]) && query[key].length > 0) {
    throw new Error(`expected only one query param but got multiple: ${key}`);
  }

  if (!(key in query)) {
    return null;
  }

  return query[key] as T;
};

const queryParamParsers: {
  [K in keyof StepperState]: (query: ParsedUrlQuery) => StepperState[K];
} = {
  stepperState: (query) =>
    getQueryParamAsString<StepperState["stepperState"]>(
      query,
      "stepperState"
    ) ?? "unstarted",
  repository: (query) => ({
    namespace: getQueryParamAsString(query, "githubNamespace"),
    repository: getQueryParamAsString(query, "githubRepository"),
  }),
  importTaskId: (query) => getQueryParamAsString(query, "importTaskId"),
  importError: (query) => getQueryParamAsString(query, "importError"),
  exportError: (query) => getQueryParamAsString(query, "exportError"),
  splitgraphNamespace: (query) =>
    getQueryParamAsString(query, "splitgraphNamespace"),
  splitgraphRepository: (query) =>
    getQueryParamAsString(query, "splitgraphRepository"),
  debug: (query) => getQueryParamAsString(query, "debug"),
};

const requireKeys = <T extends Record<string, unknown>>(
  obj: T,
  requiredKeys: (keyof T)[]
) => {
  const missingKeys = requiredKeys.filter(
    (requiredKey) => !(requiredKey in obj)
  );

  if (missingKeys.length > 0) {
    throw new Error("missing required keys: " + missingKeys.join(", "));
  }
};

const stepperStateValidators: {
  [K in StepperState["stepperState"]]: (stateFromQuery: StepperState) => void;
} = {
  uninitialized: () => {},
  unstarted: () => {},
  awaiting_import: (stateFromQuery) =>
    requireKeys(stateFromQuery, [
      "repository",
      "importTaskId",
      "splitgraphNamespace",
      "splitgraphRepository",
    ]),
  import_complete: (stateFromQuery) =>
    requireKeys(stateFromQuery, [
      "repository",
      "splitgraphNamespace",
      "splitgraphRepository",
    ]),
  awaiting_export: (stateFromQuery) =>
    requireKeys(stateFromQuery, [
      "repository",
      "splitgraphNamespace",
      "splitgraphRepository",
    ]),
  export_complete: (stateFromQuery) =>
    requireKeys(stateFromQuery, [
      "repository",
      "splitgraphNamespace",
      "splitgraphRepository",
    ]),
};

const parseStateFromRouter = (router: NextRouter): StepperState => {
  const { query } = router;

  const stepperState = queryParamParsers.stepperState(query);

  const stepper = {
    stepperState: stepperState,
    repository: queryParamParsers.repository(query),
    importTaskId: queryParamParsers.importTaskId(query),
    importError: queryParamParsers.importError(query),
    exportError: queryParamParsers.exportError(query),
    splitgraphNamespace: queryParamParsers.splitgraphNamespace(query),
    splitgraphRepository: queryParamParsers.splitgraphRepository(query),
    debug: queryParamParsers.debug(query),
  };

  void stepperStateValidators[stepperState](stepper);

  return stepper;
};

const serializeStateToQueryParams = (stepper: StepperState) => {
  return JSON.parse(
    JSON.stringify({
      stepperState: stepper.stepperState,
      githubNamespace: stepper.repository?.namespace ?? undefined,
      githubRepository: stepper.repository?.repository ?? undefined,
      importTaskId: stepper.importTaskId ?? undefined,
      importError: stepper.importError ?? undefined,
      exportError: stepper.exportError ?? undefined,
      splitgraphNamespace: stepper.splitgraphNamespace ?? undefined,
      splitgraphRepository: stepper.splitgraphRepository ?? undefined,
      debug: stepper.debug ?? undefined,
    })
  );
};

const stepperReducer = (
  state: StepperState,
  action: StepperAction
): StepperState => {
  switch (action.type) {
    case "start_import":
      return {
        ...state,
        stepperState: "awaiting_import",
        repository: action.repository,
        importTaskId: action.taskId,
        splitgraphNamespace: action.splitgraphNamespace,
        splitgraphRepository: action.splitgraphRepository,
      };
    case "import_complete":
      return {
        ...state,
        stepperState: "import_complete",
      };
    case "start_export":
      const { tables } = action;
      const exportedTablesLoading = new Set<ExportTable>();
      const exportedTablesCompleted = new Set<ExportTable>();

      for (const {
        destinationTable,
        destinationSchema,
        sourceQuery,
        fallbackCreateTableQuery,
        taskId,
      } of tables) {
        exportedTablesLoading.add({
          destinationTable,
          destinationSchema,
          sourceQuery,
          fallbackCreateTableQuery,
          taskId,
        });
      }

      // The API returns a list of tables where multiple can have the same taskId
      // We want a unique set of taskIds so that we only poll for each taskId once
      // (but note that we're storing a set of {taskId} objects but need to compare uniqueness on taskId)
      const loadingExportTasks = new Set<ExportTask>(
        Array.from(
          new Set<ExportTask["taskId"]>(
            Array.from(tables).map(({ taskId }) => taskId)
          )
        ).map((taskId) => ({ taskId }))
      );
      const completedExportTasks = new Set<ExportTask>();

      return {
        ...state,
        exportedTablesLoading,
        exportedTablesCompleted,
        loadingExportTasks,
        completedExportTasks,
        stepperState: "awaiting_export",
      };

    /**
     * NOTE: A task is "completed" even if it received an error, in which case
     * we will retry it up to maxRetryCount if `error.retryable` is `true`
     *
     * That is, _all tasks_ will eventually "complete," whether successfully or not.
     */
    case "export_task_complete":
      const {
        completedTask: { taskId: completedTaskId, error: maybeError },
      } = action;

      const maxRetryCount = 3;

      const updatedTasksWithError = new Map(state.tasksWithError);
      const previousErrors = updatedTasksWithError.get(completedTaskId) ?? [];
      const hadPreviousError = previousErrors.length > 0;

      if (!maybeError && hadPreviousError) {
        updatedTasksWithError.delete(completedTaskId);
      } else if (maybeError) {
        updatedTasksWithError.set(completedTaskId, [
          ...previousErrors,
          maybeError.message,
        ]);
        const numAttempts = updatedTasksWithError.get(completedTaskId).length;

        if (maybeError.retryable && numAttempts < maxRetryCount) {
          console.log("RETRY: ", completedTaskId, `(${numAttempts} so far)`);
          return {
            ...state,
            tasksWithError: updatedTasksWithError,
          };
        } else {
          console.log(
            "FAIL: ",
            completedTaskId,
            `(${numAttempts} reached max ${maxRetryCount})`
          );
        }
      }

      // One taskId could match multiple tables, so find reference to each of them
      // and then use that reference to delete them from loading set and add them to completed set
      const completedTables = Array.from(state.exportedTablesLoading).filter(
        ({ taskId }) => taskId === completedTaskId
      );
      const loadingTablesAfterRemoval = new Set(state.exportedTablesLoading);
      const completedTablesAfterAdded = new Set(state.exportedTablesCompleted);
      for (const completedTable of completedTables) {
        loadingTablesAfterRemoval.delete(completedTable);
        completedTablesAfterAdded.add(completedTable);
      }

      // There should only be one matching task, so find it and create new updated sets
      const completedTask = Array.from(state.loadingExportTasks).find(
        ({ taskId }) => taskId === completedTaskId
      );
      const loadingTasksAfterRemoval = new Set(state.loadingExportTasks);
      const completedTasksAfterAdded = new Set(state.completedExportTasks);
      loadingTasksAfterRemoval.delete(completedTask);
      completedTasksAfterAdded.add(completedTask);

      return {
        ...state,
        exportedTablesLoading: loadingTablesAfterRemoval,
        exportedTablesCompleted: completedTablesAfterAdded,
        loadingExportTasks: loadingTasksAfterRemoval,
        completedExportTasks: completedTasksAfterAdded,
        stepperState:
          loadingTasksAfterRemoval.size === 0
            ? "export_complete"
            : "awaiting_export",
      };

    case "export_complete":
      return {
        ...state,
        stepperState: "export_complete",
      };
    case "import_error":
      return {
        ...state,
        splitgraphRepository: null,
        splitgraphNamespace: null,
        importTaskId: null,
        stepperState: "unstarted",
        importError: action.error,
      };
    case "export_error":
      return {
        ...state,
        loadingExportTasks: new Set<ExportTask>(),
        completedExportTasks: new Set<ExportTask>(),
        exportedTablesLoading: new Set<ExportTable>(),
        exportedTablesCompleted: new Set<ExportTable>(),
        stepperState: "import_complete",
        exportError: action.error,
      };

    case "reset":
      return initialState;

    case "initialize_from_url":
      return {
        ...state,
        ...action.parsedFromUrl,
      };

    default:
      return state;
  }
};

const urlNeedsChange = (state: StepperState, router: NextRouter) => {
  const parsedFromUrl = parseStateFromRouter(router);

  return (
    state.stepperState !== parsedFromUrl.stepperState ||
    state.repository?.namespace !== parsedFromUrl.repository?.namespace ||
    state.repository?.repository !== parsedFromUrl.repository?.repository ||
    state.importTaskId !== parsedFromUrl.importTaskId ||
    state.splitgraphNamespace !== parsedFromUrl.splitgraphNamespace ||
    state.splitgraphRepository !== parsedFromUrl.splitgraphRepository
  );
};

/**
 * When the export has completed, send a request to /api/mark-import-export-complete
 * which will insert the repository into the metadata table, which we query to
 * render the sidebar
 */
const useMarkAsComplete = (
  state: StepperState,
  dispatch: React.Dispatch<StepperAction>
) => {
  useEffect(() => {
    if (state.stepperState !== "export_complete") {
      return;
    }

    const {
      repository: {
        namespace: githubSourceNamespace,
        repository: githubSourceRepository,
      },
      splitgraphRepository: splitgraphDestinationRepository,
    } = state;

    // NOTE: Make sure to abort request so that in React 18 development mode,
    // when effect runs twice, the second request is aborted and we don't have
    // a race condition with two requests inserting into the table (where we have no transactional
    // integrity and manually do a SELECT before the INSERT to check if the row already exists)
    const abortController = new AbortController();

    const markImportExportComplete = async () => {
      try {
        const response = await fetch("/api/mark-import-export-complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            githubSourceNamespace,
            githubSourceRepository,
            splitgraphDestinationRepository,
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to mark import/export as complete");
        }

        if (response.status === 204) {
          console.log("Repository already exists in metadata table");
          return;
        }

        const data = await response.json();

        if (!data.status) {
          throw new Error(
            "Got unexpected response shape when marking import/export complete"
          );
        }

        if (data.error) {
          throw new Error(
            `Failed to mark import/export complete: ${data.error}`
          );
        }

        console.log("Marked import/export as complete");
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }

        dispatch({
          type: "export_error",
          error: error.message ?? error.toString(),
        });
      }
    };

    markImportExportComplete();

    return () => abortController.abort();
  }, [state, dispatch]);
};

export const useStepperReducer = () => {
  const router = useRouter();
  const [state, dispatch] = useReducer(stepperReducer, {
    ...initialState,
    stepperState: "uninitialized",
  });

  useMarkAsComplete(state, dispatch);

  useEffect(() => {
    dispatch({
      type: "initialize_from_url",
      parsedFromUrl: parseStateFromRouter(router),
    });
  }, [router.query]);

  useEffect(() => {
    if (!urlNeedsChange(state, router)) {
      return;
    }

    if (state.stepperState === "uninitialized") {
      return;
    }

    router.push(
      {
        pathname: router.pathname,
        query: serializeStateToQueryParams(state),
      },
      undefined,
      { shallow: true }
    );
  }, [state.stepperState]);

  return [state, dispatch] as const;
};
