export interface PluginMap {
  [pluginName: string]: Plugin;
}

export interface Plugin {
  importData: (sourceOptions: any, destOptions: any) => Promise<unknown>;
}
