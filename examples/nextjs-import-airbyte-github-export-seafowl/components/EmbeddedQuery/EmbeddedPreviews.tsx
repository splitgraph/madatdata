import styles from "./EmbeddedPreviews.module.css";
import type {
  ExportTable,
  ExportQueryInput,
  ExportTableInput,
} from "../../types";

import { EmbedPreviewTableOrQuery } from "../EmbeddedQuery/EmbeddedQuery";
import { ComponentProps } from "react";

export const EmbeddedTablePreviewHeadingAndDescription = ({
  exportComplete,
}: {
  exportComplete: boolean;
}) => {
  return (
    <>
      {!exportComplete ? (
        <>
          <h2 className={styles.embeddedPreviewHeading}>Tables to Export</h2>
          <p className={styles.embeddedPreviewDescription}>
            These are the tables that we'll export from Splitgraph to Seafowl.
            You can query them in Splitgraph now, and then when the export is
            complete, you'll be able to query them in Seafowl too.
          </p>
        </>
      ) : (
        <>
          <h2 className={styles.embeddedPreviewHeading}>Exported Tables</h2>
          <p className={styles.embeddedPreviewDescription}>
            We successfully exported the tables to Seafowl, so now you can query
            them in Seafowl too.
          </p>
        </>
      )}
    </>
  );
};

export const EmbeddedTablePreviews = ({
  tablesToExport,
  splitgraphRepository,
  splitgraphNamespace,
  useLoadingOrCompleted,
}: {
  tablesToExport: ExportTableInput[];
  splitgraphRepository: string;
  splitgraphNamespace: string;
  useLoadingOrCompleted: ComponentProps<
    typeof EmbedPreviewTableOrQuery
  >["useLoadingOrCompleted"];
}) => {
  return (
    <>
      {tablesToExport.map((exportTable) => (
        <EmbedPreviewTableOrQuery
          key={`export-table-preview-${exportTable.table}`}
          exportInput={exportTable}
          importedRepository={{ splitgraphNamespace, splitgraphRepository }}
          makeQuery={({ splitgraphNamespace, splitgraphRepository, table }) =>
            `SELECT * FROM "${splitgraphNamespace}/${splitgraphRepository}"."${table}";`
          }
          useLoadingOrCompleted={useLoadingOrCompleted}
          makeMatchInputToExported={(exportTableInput) => (exportTable) => {
            return (
              exportTable.destinationSchema === exportTableInput.repository &&
              exportTable.destinationTable === exportTableInput.table
            );
          }}
        />
      ))}
    </>
  );
};

export const EmbeddedQueryPreviewHeadingAndDescription = ({
  exportComplete,
}: {
  exportComplete: boolean;
}) => {
  return (
    <>
      {" "}
      {!exportComplete ? (
        <>
          <h2 className={styles.embeddedPreviewHeading}>Queries to Export</h2>
          <p className={styles.embeddedPreviewDescription}>
            We've prepared a few queries to export from Splitgraph to Seafowl,
            so that we can use them to render the charts that we want.
            Splitgraph will execute the query and insert its result into
            Seafowl. You can query them in Splitgraph now, and then when the
            export is complete, you'll be able to query them in Seafowl too.
          </p>
        </>
      ) : (
        <>
          <h2 className={styles.embeddedPreviewHeading}>Exported Queries</h2>
          <p className={styles.embeddedPreviewDescription}>
            We successfully exported these queries from Splitgraph to Seafowl,
            so now you can query them in Seafowl too.{" "}
            <em className={styles.note}>
              Note: If some queries failed to export, it's probably because they
              had empty result sets (e.g. the table of issue reactions)
            </em>
          </p>
        </>
      )}
    </>
  );
};

export const EmbeddedQueryPreviews = ({
  queriesToExport,
  splitgraphRepository,
  splitgraphNamespace,
  useLoadingOrCompleted,
}: {
  queriesToExport: ExportQueryInput[];
  splitgraphRepository: string;
  splitgraphNamespace: string;
  useLoadingOrCompleted: ComponentProps<
    typeof EmbedPreviewTableOrQuery
  >["useLoadingOrCompleted"];
}) => {
  return (
    <>
      {queriesToExport.map((exportQuery) => (
        <EmbedPreviewTableOrQuery
          key={`export-query-preview-${exportQuery.destinationTable}-${exportQuery.destinationSchema}`}
          exportInput={exportQuery}
          importedRepository={{ splitgraphNamespace, splitgraphRepository }}
          // This is the query we run on Splitgraph that we exported to Seafowl
          makeQuery={({ sourceQuery }) => sourceQuery}
          // But once it's exported, we can just select from its table in Seafowl (and
          // besides, the sourceQuery might not be compatible with Seafowl anyway)
          makeSeafowlQuery={({ destinationSchema, destinationTable }) =>
            `SELECT * FROM "${destinationSchema}"."${destinationTable}";`
          }
          useLoadingOrCompleted={useLoadingOrCompleted}
          makeMatchInputToExported={(exportQueryInput) =>
            (exportTable: ExportTable) => {
              return (
                exportTable.destinationSchema ===
                  exportQueryInput.destinationSchema &&
                exportTable.destinationTable ===
                  exportQueryInput.destinationTable
              );
            }}
        />
      ))}
    </>
  );
};
