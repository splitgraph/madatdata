import EmbeddedQueryStyles from "./EmbeddedQuery.module.css";
import type { ExportQueryInput, ExportTableInput } from "../../types";
import { useState, useMemo } from "react";
import {
  makeSplitgraphQueryHref,
  makeSeafowlQueryHref,
} from "../RepositoryAnalytics/ImportedRepoMetadata";
import {
  SplitgraphEmbeddedQuery,
  SeafowlEmbeddedQuery,
} from "../RepositoryAnalytics/ImportedRepoMetadata";
import {
  useStepperDebug,
  useFindMatchingExportTable,
} from "../ImportExportStepper/StepperContext";

import type { ExportTable } from "../ImportExportStepper/stepper-states";

import { LoadingBar } from "../LoadingBar";

import { TabButton } from "./TabButton";

export const ExportEmbedPreviewTableOrQuery = <
  ExportInputShape extends ExportQueryInput | ExportTableInput
>({
  importedRepository,
  exportInput,
  makeQuery,
  makeMatchInputToExported,
}: {
  exportInput: ExportInputShape;
  makeQuery: (
    tableOrQueryInput: ExportInputShape & {
      splitgraphNamespace: string;
      splitgraphRepository: string;
    }
  ) => string;
  makeMatchInputToExported: (
    tableOrQueryInput: ExportInputShape
  ) => (exported: ExportTable) => boolean;
  importedRepository: {
    splitgraphNamespace: string;
    splitgraphRepository: string;
  };
}) => {
  const debug = useStepperDebug();

  const embedProps = {
    importedRepository,
    tableName:
      "destinationTable" in exportInput
        ? exportInput.destinationTable
        : exportInput.table,
    makeQuery: () => makeQuery({ ...exportInput, ...importedRepository }),
  };

  const { loading, completed } = useFindMatchingExportTable(
    makeMatchInputToExported(exportInput)
  );

  const heading =
    "table" in exportInput
      ? exportInput.table
      : `${exportInput.destinationSchema}.${exportInput.destinationTable}`;

  const [selectedTab, setSelectedTab] = useState<"splitgraph" | "seafowl">(
    "splitgraph"
  );

  const linkToConsole = useMemo(() => {
    switch (selectedTab) {
      case "splitgraph":
        return {
          anchor: "Open in Console",
          href: makeSplitgraphQueryHref(
            makeQuery({ ...exportInput, ...importedRepository })
          ),
        };

      case "seafowl":
        return {
          anchor: "Open in Console",
          href: makeSeafowlQueryHref(
            makeQuery({ ...exportInput, ...importedRepository })
          ),
        };
    }
  }, [selectedTab]);

  return (
    <div className={EmbeddedQueryStyles.embeddedQuery}>
      <h4 className={EmbeddedQueryStyles.heading}>
        <code>{heading}</code>
      </h4>
      <div className={EmbeddedQueryStyles.topBar}>
        <div className={EmbeddedQueryStyles.consoleFlavorButtonsAndLoadingBar}>
          <TabButton
            onClick={() => setSelectedTab("splitgraph")}
            active={selectedTab === "splitgraph"}
            style={{ marginRight: "1rem" }}
            title={
              selectedTab === "splitgraph"
                ? ""
                : "Query the imported data in Splitgraph"
            }
          >
            data.splitgraph.com
          </TabButton>
          <TabButton
            onClick={() => setSelectedTab("seafowl")}
            active={selectedTab === "seafowl"}
            disabled={!completed}
            style={{ marginRight: "1rem" }}
            title={
              selectedTab === "seafowl"
                ? ""
                : completed
                ? "Query the exported data in Seafowl"
                : "Once you export the data to Seafowl, you can send the same query to Seafowl"
            }
          >
            demo.seafowl.cloud
          </TabButton>
          {loading && (
            <LoadingBar
              formatTimeElapsed={(seconds) =>
                `Export to Seafowl: Started ${seconds} seconds ago...`
              }
            />
          )}
        </div>
        <div className={EmbeddedQueryStyles.embedControls}>
          <a
            href={linkToConsole.href}
            target="_blank"
            rel="noopener"
            className={EmbeddedQueryStyles.openInConsoleLink}
          >
            <IconOpenInConsole size={14} />
            {linkToConsole.anchor}
          </a>
        </div>
      </div>

      {debug && <pre>{JSON.stringify({ completed, loading }, null, 2)}</pre>}
      {
        <div
          style={{
            visibility: selectedTab === "splitgraph" ? "visible" : "hidden",
            display: selectedTab === "seafowl" ? "none" : "block",
          }}
        >
          <SplitgraphEmbeddedQuery {...embedProps} />
        </div>
      }
      {completed && (
        <div
          style={{
            visibility: selectedTab === "seafowl" ? "visible" : "hidden",
            display: selectedTab === "splitgraph" ? "none" : "block",
          }}
        >
          <SeafowlEmbeddedQuery {...embedProps} />
        </div>
      )}
    </div>
  );
};

export const IconOpenInConsole = ({ size }: { size: number | string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M10.625 2.5H3.75C2.36929 2.5 1.25 3.61929 1.25 5V15C1.25 16.3807 2.36929 17.5 3.75 17.5H16.25C17.6307 17.5 18.75 16.3807 18.75 15V10.625"
      stroke="currentColor"
      strokeWidth="1.25"
    />
    <path
      d="M18.7501 8.2291L18.7501 2.49946M13.213 2.49961L18.7501 2.49946M18.7501 2.49946L12.5712 8.67797"
      stroke="currentColor"
      strokeWidth="1.25"
    />
    <path
      d="M5 6.875L8.125 10L5 13.125"
      stroke="currentColor"
      strokeWidth="1.25"
    />
    <path d="M10.625 13.125H15" stroke="currentColor" strokeWidth="1.25" />
  </svg>
);
