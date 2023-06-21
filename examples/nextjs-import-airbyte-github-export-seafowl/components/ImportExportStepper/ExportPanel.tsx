import { useStepper } from "./StepperContext";
import styles from "./ExportPanel.module.css";

import { splitgraphTablesToExportToSeafowl } from "../../lib/config/github-tables";
import {
  genericDemoQuery,
  makeQueriesToExport,
} from "../../lib/config/queries-to-export";
import type {
  ExportQueryInput,
  ExportTableInput,
  StartExportToSeafowlRequestShape,
  StartExportToSeafowlResponseData,
} from "../../types";
import { useMemo, useCallback } from "react";
import { StepTitle } from "./StepTitle";
import { StepDescription } from "./StepDescription";
import { makeSplitgraphQueryHref } from "../RepositoryAnalytics/ImportedRepoMetadata";
import type { ExportTable } from "./stepper-states";

import { ExportEmbedPreviewTableOrQuery } from "../EmbeddedQuery/EmbeddedQuery";
import { usePollExportTasks } from "./export-hooks";

export const ExportPanel = () => {
  const [
    { stepperState, exportError, splitgraphRepository, splitgraphNamespace },
    dispatch,
  ] = useStepper();

  usePollExportTasks();

  const queriesToExport = useMemo<ExportQueryInput[]>(
    () =>
      makeQueriesToExport({
        splitgraphSourceRepository: splitgraphRepository,
        splitgraphSourceNamespace: splitgraphNamespace,
        seafowlDestinationSchema: `${splitgraphNamespace}/${splitgraphRepository}`,
      }),
    [splitgraphRepository, splitgraphNamespace]
  );

  const tablesToExport = useMemo<ExportTableInput[]>(
    () =>
      splitgraphTablesToExportToSeafowl.map((tableName) => ({
        namespace: splitgraphNamespace,
        repository: splitgraphRepository,
        table: tableName,
      })),
    [
      splitgraphNamespace,
      splitgraphRepository,
      splitgraphTablesToExportToSeafowl,
    ]
  );

  const handleStartExport = useCallback(async () => {
    const abortController = new AbortController();

    try {
      const response = await fetch("/api/start-export-to-seafowl", {
        method: "POST",
        body: JSON.stringify({
          tables: tablesToExport,
          queries: queriesToExport,
        } as StartExportToSeafowlRequestShape),
        headers: {
          "Content-Type": "application/json",
        },
        signal: abortController.signal,
      });
      const data = (await response.json()) as StartExportToSeafowlResponseData;

      if ("error" in data && data["error"]) {
        throw new Error(data["error"]);
      }

      if (!("tables" in data) || !("queries" in data)) {
        throw new Error("Response missing tables");
      }

      dispatch({
        type: "start_export",
        tables: [
          ...data["queries"].map(
            ({ sourceQuery, taskId, destinationSchema, destinationTable }) => ({
              taskId,
              destinationTable,
              destinationSchema,
              sourceQuery,
            })
          ),
          ...data["tables"].map(
            ({ destinationTable, destinationSchema, taskId }) => ({
              taskId,
              destinationTable,
              destinationSchema,
            })
          ),
        ],
      });
    } catch (error) {
      if (error.name === "AbortError") {
        return;
      }

      dispatch({ type: "export_error", error: error.message });
    }

    return () => abortController.abort();
  }, [queriesToExport, tablesToExport, dispatch]);

  const stepStatus = (() => {
    switch (stepperState) {
      case "import_complete":
        return "active";
      case "awaiting_export":
        return "loading";
      case "export_complete":
        return "completed";
      default:
        return "unstarted";
    }
  })();

  return (
    <div className={styles.exportPanel}>
      <StepTitle
        stepNumber={2}
        stepTitle={"Export Data from Splitgraph to Seafowl"}
        status={stepStatus}
      />
      <StepDescription status={stepStatus}>
        {stepStatus === "completed" ? (
          <div className={styles.exportCompleteInfo}>
            <p>
              &#10003; Export complete! We successfully imported tables and
              queries from Splitgraph to our{" "}
              <a href="https://seafowl.io" target="_blank">
                Seafowl
              </a>{" "}
              instance running at <code>https://demo.seafowl.cloud</code>. Now
              we can query it and get cache-optimized responses for rendering
              charts and analytics.{" "}
            </p>
          </div>
        ) : (
          <div className={styles.exportInfo}>
            {["uninitialized", "unstarted", "awaiting_import"].includes(
              stepperState
            )
              ? "Next we'll "
              : "Now let's "}
            export some tables and pre-made queries from our staging area in
            Splitgraph to our cache-optimized{" "}
            <a href="https://seafowl.io" target="_blank">
              Seafowl
            </a>{" "}
            instance running at <code>https://demo.seafowl.cloud</code>. This
            demo exports them programatically with{" "}
            <a target="_blank" href="https://github.com/splitgraph/madatdata">
              madatdata
            </a>{" "}
            calling the Splitgraph API from a Next.js API route, but you can
            write your own queries and manually export them from the{" "}
            <a
              href={makeSplitgraphQueryHref(`--- Splitgraph is a public data platform that allows you to query and share data sets
--- You can write any query you want here, and run it against data.splitgraph.com
--- If you're logged in, you can also export the query to a Seafowl instance (defaulting to demo.seafowl.cloud)

${genericDemoQuery}
`)}
              target="_blank"
            >
              Splitgraph Console
            </a>{" "}
            (once you've created an account and logged into Splitgraph).
            {stepStatus === "active" && (
              <>
                <br />
                <br /> <b>Click the button to start the export.</b> While it's
                running, you can use the embedded query editors to play with the
                imported Splitgraph data, and when it's complete, you can run
                the same queries in Seafowl.
              </>
            )}
          </div>
        )}
      </StepDescription>
      {["import_complete", "awaiting_export", "export_complete"].includes(
        stepperState
      ) && (
        <button
          className={[
            styles.startExportButton,
            ...(stepperState === "awaiting_export"
              ? [styles.startExportButtonLoading]
              : []),
          ].join(" ")}
          onClick={handleStartExport}
          title={
            stepperState === "export_complete"
              ? "Trigger another export job, which will overwrite the data in Seafowl"
              : stepperState === "awaiting_export"
              ? "Exporting tables and queries to Seafowl..."
              : "Trigger an export job from Splitgraph to Seafowl"
          }
        >
          {stepperState === "awaiting_export"
            ? "Exporting Tables and Queries to Seafowl..."
            : stepperState === "export_complete"
            ? "Restart Export of Tables and Queries to Seafowl"
            : "Start Export of Tables and Queries to Seafowl"}
        </button>
      )}
      {exportError && <p className={styles.error}>{exportError}</p>}
      {["import_complete", "awaiting_export", "export_complete"].includes(
        stepperState
      ) && (
        <ExportPreview
          stepperState={
            stepperState as
              | "import_complete"
              | "awaiting_export"
              | "export_complete"
          }
          tablesToExport={tablesToExport}
          queriesToExport={queriesToExport}
          splitgraphRepository={splitgraphRepository}
          splitgraphNamespace={splitgraphNamespace}
        />
      )}
    </div>
  );
};

const ExportPreview = ({
  stepperState,
  tablesToExport,
  queriesToExport,
  splitgraphRepository,
  splitgraphNamespace,
}: {
  stepperState: "import_complete" | "awaiting_export" | "export_complete";
  tablesToExport: ExportTableInput[];
  queriesToExport: ExportQueryInput[];
  splitgraphRepository: string;
  splitgraphNamespace: string;
}) => {
  return (
    <>
      {stepperState !== "export_complete" ? (
        <>
          <h2 className={styles.exportPreviewHeading}>Tables to Export</h2>
          <p className={styles.exportPreviewDescription}>
            These are the tables that we'll export from Splitgraph to Seafowl.
            You can query them in Splitgraph now, and then when the export is
            complete, you'll be able to query them in Seafowl too.
          </p>
        </>
      ) : (
        <>
          <h2 className={styles.exportPreviewHeading}>Exported Tables</h2>
          <p className={styles.exportPreviewDescription}>
            We successfully exported the tables to Seafowl, so now you can query
            them in Seafowl too.
          </p>
        </>
      )}

      {tablesToExport
        .filter((_) => true)
        .map((exportTable) => (
          <ExportEmbedPreviewTableOrQuery
            key={`export-table-preview-${exportTable.table}`}
            exportInput={exportTable}
            importedRepository={{ splitgraphNamespace, splitgraphRepository }}
            makeQuery={({ splitgraphNamespace, splitgraphRepository, table }) =>
              `SELECT * FROM "${splitgraphNamespace}/${splitgraphRepository}"."${table}";`
            }
            makeMatchInputToExported={(exportTableInput) => (exportTable) => {
              return (
                exportTable.destinationSchema === exportTableInput.repository &&
                exportTable.destinationTable === exportTableInput.table
              );
            }}
          />
        ))}

      {stepperState !== "export_complete" ? (
        <>
          <h2 className={styles.exportPreviewHeading}>Queries to Export</h2>
          <p className={styles.exportPreviewDescription}>
            We've prepared a few queries to export from Splitgraph to Seafowl,
            so that we can use them to render the charts that we want.
            Splitgraph will execute the query and insert its result into
            Seafowl. You can query them in Splitgraph now, and then when the
            export is complete, you'll be able to query them in Seafowl too.
          </p>
        </>
      ) : (
        <>
          <h2 className={styles.exportPreviewHeading}>Exported Queries</h2>
          <p className={styles.exportPreviewDescription}>
            We successfully exported these queries from Splitgraph to Seafowl,
            so now you can query them in Seafowl too.{" "}
            <em className={styles.exportNote}>
              Note: If some queries failed to export, it's probably because they
              had empty result sets (e.g. the table of issue reactions)
            </em>
          </p>
        </>
      )}

      {queriesToExport
        .filter((_) => true)
        .map((exportQuery) => (
          <ExportEmbedPreviewTableOrQuery
            key={`export-query-preview-${exportQuery.destinationTable}-${exportQuery.destinationSchema}`}
            exportInput={exportQuery}
            importedRepository={{ splitgraphNamespace, splitgraphRepository }}
            makeQuery={({ sourceQuery }) => sourceQuery}
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
