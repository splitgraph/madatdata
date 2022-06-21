import type { PluginMap } from "./plugin-bindings";

export interface Db<ConcretePluginMap extends PluginMap> {
  importData: <PluginName extends keyof ConcretePluginMap>(
    pluginName: PluginName,
    sourceOptions: Parameters<ConcretePluginMap[PluginName]["importData"]>[0],
    destOptions: Parameters<ConcretePluginMap[PluginName]["importData"]>[1]
  ) => Promise<unknown>;
}

export abstract class BaseDb<ConcretePluginMap extends PluginMap>
  implements Db<ConcretePluginMap>
{
  // constructor(opts: DbOptions) {}

  abstract importData<PluginName extends keyof ConcretePluginMap>(
    pluginName: PluginName,
    sourceOptions: Parameters<ConcretePluginMap[PluginName]["importData"]>[0],
    destOptions: Parameters<ConcretePluginMap[PluginName]["importData"]>[1]
  ): Promise<unknown>;
}
