import type { ImportPlugin } from "@madatdata/base-db";

type DEFAULT_IMPORT_PLUGINS = "csv";

type DefaultPluginMap = {
  importers: {
    [k in DEFAULT_IMPORT_PLUGINS]: ImportPlugin;
  };
  exporters: {};
};

export type SeafowlPluginMap = DefaultPluginMap;
export type SeafowlExportPluginMap = SeafowlPluginMap["exporters"];
export type SeafowlImportPluginMap = SeafowlPluginMap["importers"];
