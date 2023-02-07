// export interface PluginMap<ConcretePluginMap = Record<string,never>> {
//   [pluginName: keyof ConcretePluginMap]: PluginMap[pluginName] extends never
//     ? Plugin
//   : PluginMap[pluginName];

// }

type PluginMapShape = {
  importers: Record<string, ImportPlugin>;
  exporters: Record<string, ExportPlugin>;
};

export type PluginMap<
  ConcretePluginMap extends PluginMapShape = {
    importers: PluginMapShape["importers"];
    exporters: PluginMapShape["exporters"];
  }
> = {
  importers: {
    [pluginName in keyof ConcretePluginMap["importers"]]: ConcretePluginMap["importers"] extends never
      ? ImportPlugin
      : ConcretePluginMap["importers"][pluginName];
  };
  exporters: {
    [pluginName in keyof ConcretePluginMap["exporters"]]: ConcretePluginMap["exporters"] extends never
      ? ExportPlugin
      : ConcretePluginMap["exporters"][pluginName];
  };
};

export type OptionalPluginMap<
  ConcretePluginMap extends PluginMapShape = {
    importers: any;
    exporters: any;
  },
  Importers = PluginMap<ConcretePluginMap>["importers"],
  Exporters = PluginMap<ConcretePluginMap>["exporters"]
> = {
  importers: Partial<Importers>;
  exporters: Partial<Exporters>;
};

export type WithOptions<OuterClassT> = <
  InjectedOpts,
  InnerClassT extends OuterClassT
>(
  injectOpts: InjectedOpts
) => InnerClassT | OuterClassT;

export interface WithOptionsInterface<ClassT> {
  withOptions: WithOptions<ClassT>;
}

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

  graphqlEndpoint: string;
}

// export abstract class

export interface ImportPlugin extends BasePlugin {
  withOptions: WithOptions<ImportPlugin>;
  importData: (
    sourceOptions: any,
    destOptions: any
  ) => Promise<{ response: any | null; error: any | null; info?: any | null }>;
}

export interface ExportPlugin extends BasePlugin {
  withOptions: WithOptions<ExportPlugin>;
  exportData: (
    sourceOptions: any,
    destOptions: any
  ) => Promise<{ response: any | null; error: any | null; info?: any | null }>;
}

export type Plugin = ImportPlugin | ExportPlugin;

// export type PluginMap = Map<string, Plugin>;
