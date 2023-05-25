// stepper-states.ts
export type GitHubRepository = { namespace: string; repository: string };

type ExportTable = { tableName: string; taskId: string };

export type StepperState = {
  stepperState:
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
  | { type: "export_complete" }
  | { type: "export_error"; error: string }
  | { type: "import_error"; error: string }
  | { type: "reset" };

export const initialState: StepperState = {
  stepperState: "unstarted",
  repository: null,
  splitgraphRepository: null,
  splitgraphNamespace: null,
  importTaskId: null,
  exportedTablesLoading: new Set<ExportTable>(),
  exportedTablesCompleted: new Set<ExportTable>(),
  importError: null,
  exportError: null,
};

// FOR DEBUGGING: uncomment for hardcoded state initialization
// export const initialState: StepperState = {
//   ...normalInitialState,
//   stepperState: "import_complete",
//   splitgraphNamespace: "miles",
//   splitgraphRepository: "import-via-nextjs",
// };

// Reducer function
export const stepperReducer = (
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

      for (const { tableName, taskId } of tables) {
        exportedTablesLoading.add({ tableName, taskId });
      }

      return {
        ...state,
        exportedTablesLoading,
        exportedTablesCompleted,
        stepperState: "awaiting_export",
      };

    case "export_table_task_complete":
      const { completedTable } = action;

      // We're storing a set of completedTable objects, so we need to find the matching one to remove it
      const loadingTablesAfterRemoval = new Set(state.exportedTablesLoading);
      const loadingTabletoRemove = Array.from(loadingTablesAfterRemoval).find(
        ({ taskId }) => taskId === completedTable.taskId
      );
      loadingTablesAfterRemoval.delete(loadingTabletoRemove);

      // Then we can add the matching one to the completed table
      const completedTablesAfterAdded = new Set(state.exportedTablesCompleted);
      completedTablesAfterAdded.add(completedTable);

      return {
        ...state,
        exportedTablesLoading: loadingTablesAfterRemoval,
        exportedTablesCompleted: completedTablesAfterAdded,
        stepperState:
          loadingTablesAfterRemoval.size === 0
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
        exportedTablesLoading: new Set<ExportTable>(),
        exportedTablesCompleted: new Set<ExportTable>(),
        stepperState: "import_complete",
        exportError: action.error,
      };

    case "reset":
      return initialState;

    default:
      return state;
  }
};
