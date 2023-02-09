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
> implements PluginMap
{
  public plugins: OptionalPluginMap<ConcretePluginMap>;

  constructor(
    plugins: OptionalPluginMap<ConcretePluginMap>,
    { helpers: _helpers }: { helpers?: any }
  ) {
    this.plugins = registerPlugins<ConcretePluginMap, PluginHostContext>(
      this,
      plugins
    );

    // const _importers = Object.entries(this.plugins.importers).map(
    //   ([_, v]) => v
    // );
  }

  public get importers(): PluginMap["importers"] {
    const rval = Object.entries(this.plugins.importers)
      .filter(([_, plugin]) => plugin.importData)
      .reduce(
        (acc, [pluginName, plugin]) => ({
          ...acc,
          [pluginName]: plugin,
        }),
        {}
      );

    return rval;

    // for (const [pluginName, plugin] of Object.entries(this.plugins.importers)) {
    // }
  }

  public get exporters(): PluginMap["exporters"] {
    const rval = Object.entries(this.plugins.exporters)
      .filter(([_, plugin]) => plugin.exportData)
      .reduce(
        (acc, [pluginName, plugin]) => ({
          ...acc,
          [pluginName]: plugin,
        }),
        {}
      );
    return rval;
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
) => {
  return {
    importers: {
      ...pluginMap.importers,
    },
    exporters: {
      ...pluginMap.exporters,
    },
  };
};
