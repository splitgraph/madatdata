import type { ImportPlugin } from "@madatdata/base-db";
import type { SeafowlImportFilePlugin } from "./seafowl-import-file-plugin";

type DEFAULT_IMPORT_PLUGINS = "csv";

type DefaultPluginMap = {
  // NOTE: hacky, only works for one plugin really
  importers: {
    [k in DEFAULT_IMPORT_PLUGINS]: k extends "csv" | "parquet"
      ? SeafowlImportFilePlugin
      : ImportPlugin;
  };
  exporters: {};
};

export type SeafowlPluginMap = DefaultPluginMap;
export type SeafowlExportPluginMap = SeafowlPluginMap["exporters"];
export type SeafowlImportPluginMap = SeafowlPluginMap["importers"];
