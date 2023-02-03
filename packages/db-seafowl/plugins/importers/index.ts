import type { ImportPlugin } from "@madatdata/base-db";

type DEFAULT_PLUGINS = "csv";

type DefaultPluginMap = {
  [k in DEFAULT_PLUGINS]: ImportPlugin;
};

export type SeafowlImportPluginMap = DefaultPluginMap;
