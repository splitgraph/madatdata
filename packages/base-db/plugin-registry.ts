import type { OptionalPluginMap, PluginMap } from "./plugin-bindings";

export interface WithPluginRegistry<
  ConcretePluginMap extends PluginMap,
  PluginHostContext extends object
> {
  plugins: PluginRegistry<ConcretePluginMap, PluginHostContext>;
}

export class PluginRegistry<
  ConcretePluginMap extends PluginMap,
  PluginHostContext extends object
> implements OptionalPluginMap<ConcretePluginMap>
{
  public plugins: OptionalPluginMap<ConcretePluginMap>;
  public hostContext: PluginHostContext;

  constructor(
    plugins: OptionalPluginMap<ConcretePluginMap>,
    hostContext: PluginHostContext
  ) {
    this.plugins = registerPlugins<ConcretePluginMap, PluginHostContext>(
      this,
      plugins
    );

    this.hostContext = hostContext;
  }

  public get importers(): OptionalPluginMap<ConcretePluginMap>["importers"] {
    const pluginsWithImportDataMethod: OptionalPluginMap<ConcretePluginMap>["importers"] =
      Object.entries(this.plugins.importers)
        .filter(([_, plugin]) => plugin.importData)
        .reduce(
          (acc, [pluginName, plugin]) => ({
            ...acc,
            [pluginName]: plugin,
          }),
          {}
        );

    return pluginsWithImportDataMethod;
  }

  public get exporters(): OptionalPluginMap<ConcretePluginMap>["exporters"] {
    const pluginsWithExportDataMethod: OptionalPluginMap<ConcretePluginMap>["exporters"] =
      Object.entries(this.plugins.exporters)
        .filter(([_, plugin]) => plugin.exportData)
        .reduce(
          (acc, [pluginName, plugin]) => ({
            ...acc,
            [pluginName]: plugin,
          }),
          {}
        );
    return pluginsWithExportDataMethod;
  }

  public get helpers() {
    return;
  }
}

const registerPlugins = <
  ConcretePluginMap extends PluginMap,
  PluginHostContext extends object
>(
  _pluginRegistry: PluginRegistry<ConcretePluginMap, PluginHostContext>,
  pluginMap: OptionalPluginMap<ConcretePluginMap>
): OptionalPluginMap<ConcretePluginMap> => {
  return {
    importers: {
      ...pluginMap.importers,
    },
    exporters: {
      ...pluginMap.exporters,
    },
  };
};
