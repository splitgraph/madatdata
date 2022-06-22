import type { ImportCSVPluginInterface } from "./import-csv-plugin";
import type { SplitgraphImportPlugin } from "./base-import-plugin";

// NOTE: In theory this will be auto-generated
type DEFAULT_PLUGINS = "mysql" | "postgres";

type SPECIAL_PLUGINS = {
  csv: ImportCSVPluginInterface;
};

type SpecialPluginMap = {
  [k in keyof SPECIAL_PLUGINS]: SPECIAL_PLUGINS[k];
};

type DefaultPluginMap = {
  [k in DEFAULT_PLUGINS]: SplitgraphImportPlugin;
};

export type SplitgraphImportPluginMap = DefaultPluginMap & SpecialPluginMap;
