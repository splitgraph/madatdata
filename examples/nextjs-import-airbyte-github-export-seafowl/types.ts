export interface ImportedRepository {
  githubNamespace: string;
  githubRepository: string;
  splitgraphNamespace: string;
  splitgraphRepository: string;
}

export interface TargetSplitgraphRepo {
  splitgraphNamespace?: string;
  splitgraphRepository: string;
}

export type ExportTableInput = {
  namespace: string;
  repository: string;
  table: string;
};

export type ExportQueryInput = {
  sourceQuery: string;
  destinationSchema: string;
  destinationTable: string;
};

export type StartExportToSeafowlRequestShape =
  | {
      tables: ExportTableInput[];
    }
  | { queries: ExportQueryInput[] }
  | { tables: ExportTableInput[]; queries: ExportQueryInput[] };

export type StartExportToSeafowlResponseData =
  | {
      tables: {
        destinationTable: string;
        destinationSchema: string;
        taskId: string;
      }[];
      queries: {
        sourceQuery: string;
        destinationSchema: string;
        destinationTable: string;
        taskId: string;
      }[];
    }
  | { error: string };
