// export interface PluginMap<ConcretePluginMap = Record<string,never>> {
//   [pluginName: keyof ConcretePluginMap]: PluginMap[pluginName] extends never
//     ? Plugin
//   : PluginMap[pluginName];

// }

export type PluginMap<ConcretePluginMap extends Record<string, Plugin> = any> =
  {
    [pluginName in keyof ConcretePluginMap]: ConcretePluginMap extends never
      ? Plugin
      : ConcretePluginMap[pluginName];
  };

export interface BasePlugin {
  // importData: <
  //   SourceOptions extends Record<PropertyKey, unknown>,
  //   DestOptions extends Record<PropertyKey, unknown>,
  //   ResultShape extends Record<PropertyKey, unknown>,
  //   ErrorShape extends Record<PropertyKey, unknown>
  // >(
  //   sourceOptions: SourceOptions,
  //   destOptions: DestOptions
  // ) => Promise<{ response: ResultShape | null; error: ErrorShape | null }>;

  __name?: string;
}

export interface ImportPlugin extends BasePlugin {
  importData: (
    sourceOptions: any,
    destOptions: any
  ) => Promise<{ response: any | null; error: any | null; info?: any | null }>;
}

export interface ExportPlugin extends BasePlugin {
  exportData: (
    sourceOptions: any,
    destOptions: any
  ) => Promise<{ response: any | null; error: any | null; info?: any | null }>;
}

export type Plugin = ImportPlugin | ExportPlugin;

// export type PluginMap = Map<string, Plugin>;
