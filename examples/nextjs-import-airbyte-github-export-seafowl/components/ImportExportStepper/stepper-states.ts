// stepper-states.ts
export type GitHubRepository = { namespace: string; repository: string };

// Define the state
export type StepperState = {
  stepperState:
    | "unstarted"
    | "awaiting_import"
    | "import_complete"
    | "awaiting_export"
    | "export_complete";
  repository?: GitHubRepository | null;
  taskId?: string | null;
  error?: string;
  tables?: { taskId: string }[] | null;
  splitgraphRepository?: string;
  splitgraphNamespace?: string;
};

// Define the actions
export type StepperAction =
  | {
      type: "start_import";
      repository: GitHubRepository;
      taskId: string;
      splitgraphRepository: string;
      splitgraphNamespace: string;
    }
  | { type: "import_complete" }
  | { type: "start_export"; tables: { taskId: string }[] }
  | { type: "export_complete" }
  | { type: "import_error"; error: string }
  | { type: "reset" };

// Initial state
export const initialState: StepperState = {
  stepperState: "unstarted",
  repository: null,
  splitgraphRepository: null,
  splitgraphNamespace: null,
  taskId: null,
  tables: null,
};

// Reducer function
export const stepperReducer = (
  state: StepperState,
  action: StepperAction
): StepperState => {
  console.log("Got action", action, "prev state:", state);
  switch (action.type) {
    case "start_import":
      return {
        ...state,
        stepperState: "awaiting_import",
        repository: action.repository,
        taskId: action.taskId,
        splitgraphNamespace: action.splitgraphNamespace,
        splitgraphRepository: action.splitgraphRepository,
      };
    case "import_complete":
      return {
        ...state,
        stepperState: "import_complete",
      };
    case "start_export":
      return {
        ...state,
        stepperState: "awaiting_export",
        tables: action.tables,
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
        taskId: null,
        stepperState: "unstarted",
        error: action.error,
      };

    case "reset":
      return initialState;

    default:
      return state;
  }
};
