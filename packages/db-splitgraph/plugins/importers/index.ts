import type { SplitgraphImportCSVPlugin } from "./splitgraph-import-csv-plugin";
import type {
  /*ExportPlugin,*/ ExportPlugin,
  ImportPlugin,
} from "@madatdata/base-db";
import type { ExportQueryPlugin } from "../exporters/export-query-plugin";

// NOTE: In theory this will be auto-generated
type DEFAULT_IMPORT_PLUGINS = "mysql" | "postgres";
type SPECIAL_IMPORT_PLUGINS = {
  csv: SplitgraphImportCSVPlugin;
};
export type SplitgraphPluginMap = {
  importers: {
    [k in DEFAULT_IMPORT_PLUGINS]: ImportPlugin;
  } & {
    [k in keyof SPECIAL_IMPORT_PLUGINS]: SPECIAL_IMPORT_PLUGINS[k];
  };
  exporters: {
    exportQuery: ExportQueryPlugin;

    // This is here just to make sure ExportPlugin is part of the types
    defaultExport: ExportPlugin;
  };
};

export type SplitgraphPluginList = (
  | SplitgraphPluginMap["exporters"][keyof SplitgraphPluginMap["exporters"]]
  | SplitgraphPluginMap["importers"][keyof SplitgraphPluginMap["importers"]]
)[];

export type SplitgraphImportPluginMap = SplitgraphPluginMap["importers"];
export type SplitgraphExportPluginMap = SplitgraphPluginMap["exporters"];
