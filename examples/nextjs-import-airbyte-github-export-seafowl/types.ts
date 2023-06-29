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

export type ExportTable = {
  destinationSchema: string;
  destinationTable: string;
  taskId: string;
  sourceQuery?: string;
  fallbackCreateTableQuery?: string;
};

export type ExportTableInput = {
  namespace: string;
  repository: string;
  table: string;
};

export type ExportQueryInput = {
  sourceQuery: string;
  destinationSchema: string;
  destinationTable: string;
  fallbackCreateTableQuery?: string;
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

export type CreateFallbackTableForFailedExportRequestShape = {
  /**
   * The query to execute to create the fallback table. Note that it should
   * already include `destinationSchema` and `destinationTable` in the query,
   * but those still need to be passed separately to the endpoint so that it
   * can `CREATE SCHEMA` and `DROP TABLE` prior to executing the `CREATE TABLE` query.
   */
  fallbackCreateTableQuery: string;
  destinationSchema: string;
  destinationTable: string;
};

export type CreateFallbackTableForFailedExportResponseData =
  | {
      error: string;
      success: false;
    }
  | {
      success: true;
    };
