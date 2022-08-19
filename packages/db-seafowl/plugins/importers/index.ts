import type { Plugin } from "@madatdata/base-db";

type DEFAULT_PLUGINS = "csv";

type DefaultPluginMap = {
  [k in DEFAULT_PLUGINS]: Plugin;
};

export type SeafowlImportPluginMap = DefaultPluginMap;
