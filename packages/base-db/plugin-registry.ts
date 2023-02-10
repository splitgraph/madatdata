import type { OptionalPluginMap, PluginMap } from "./plugin-bindings";

// type PluggableInterfaceShape = {
//   [k: string | number | symbol]: (...args: any) => any;
// };
// type PluggableInterfaceShape = Record<any, (...args: any) => any>;

export type PluggableInterfaceShape<
  T extends Record<any, (...args: unknown[]) => unknown> = Record<
    any,
    (...args: any[]) => any
  >
> = {
  [k in keyof T]: T[k] extends Function ? T[k] : never;
};

export interface WithPluginRegistry<
  ConcretePluginMap extends PluginMap,
  PluginHostContext extends object,
  PluggableInterface extends PluggableInterfaceShape
> {
  plugins: PluginRegistry<
    ConcretePluginMap,
    PluginHostContext,
    PluggableInterface
  >;
}

type ValidPluginName<ConcretePluginMap extends PluginMap> =
  keyof (ConcretePluginMap["exporters"] & ConcretePluginMap["importers"]);

export class PluginRegistry<
  ConcretePluginMap extends PluginMap,
  PluginHostContext extends object,
  PluggableInterface extends PluggableInterfaceShape
> implements OptionalPluginMap<ConcretePluginMap>
{
  public plugins: OptionalPluginMap<ConcretePluginMap>;
  public hostContext: PluginHostContext;

  constructor(
    plugins: OptionalPluginMap<ConcretePluginMap>,
    hostContext: PluginHostContext
  ) {
    this.plugins = registerPlugins<
      ConcretePluginMap,
      PluginHostContext,
      PluggableInterface
    >(this, plugins);

    this.hostContext = hostContext;
  }

  public async callFunction<FunctionName extends keyof PluggableInterface>(
    pluginName: ValidPluginName<ConcretePluginMap>,
    functionName: FunctionName,
    ...rest: Parameters<PluggableInterface[FunctionName]>
  ) {
    console.log(
      `<pluginName=${String(pluginName)}> CALL <functionName=${String(
        functionName
      )}> with ARGS <${JSON.stringify({ rest })}>`
    );
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
  PluginHostContext extends object,
  PluggableInterface extends PluggableInterfaceShape
>(
  _pluginRegistry: PluginRegistry<
    ConcretePluginMap,
    PluginHostContext,
    PluggableInterface
  >,
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
