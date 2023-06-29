import type { ImportPlugin } from "@madatdata/base-db";
import type { SeafowlImportFilePlugin } from "./seafowl-import-file-plugin";

type DEFAULT_IMPORT_PLUGINS = "csv";

type DefaultPluginMap = {
  // NOTE: hacky, only works for one plugin really
  importers:
    | {
        [k in DEFAULT_IMPORT_PLUGINS]: k extends "csv" | "parquet"
          ? SeafowlImportFilePlugin
          : ImportPlugin<string>;
      };
  exporters: {};
};

export type SeafowlPluginMap = DefaultPluginMap;

export type SeafowlPluginList = (
  | SeafowlPluginMap["exporters"][keyof SeafowlPluginMap["exporters"]]
  | SeafowlPluginMap["importers"][keyof SeafowlPluginMap["importers"]]
)[];

export type SeafowlExportPluginMap = SeafowlPluginMap["exporters"];
export type SeafowlImportPluginMap = SeafowlPluginMap["importers"];
