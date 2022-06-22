import type { ImportCSVPlugin } from "./import-csv-plugin";
import type { Plugin } from "@madatdata/base-db";

// NOTE: In theory this will be auto-generated
type DEFAULT_PLUGINS = "mysql" | "postgres";

type SPECIAL_PLUGINS = {
  csv: ImportCSVPlugin;
};

type SpecialPluginMap = {
  [k in keyof SPECIAL_PLUGINS]: SPECIAL_PLUGINS[k];
};

type DefaultPluginMap = {
  [k in DEFAULT_PLUGINS]: Plugin;
};

export type SplitgraphImportPluginMap = DefaultPluginMap & SpecialPluginMap;
