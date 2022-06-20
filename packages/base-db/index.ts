export type ImportDataFunction = <
  SourceOptions,
  DestOptions,
  ResultShape extends Record<PropertyKey, unknown>,
  ErrorShape extends Record<PropertyKey, unknown>
>(
  sourceOptions: SourceOptions,
  destOptions: DestOptions
) => Promise<
  { response: ResultShape; error: null } | { response: null; error: ErrorShape }
>;

export interface Plugin {
  importData: ImportDataFunction;
}

export interface PluginMap {
  [pluginName: string]: Plugin;
}

export interface Db<ConcretePluginMap extends PluginMap> {
  importData: <PluginName extends keyof ConcretePluginMap>(
    pluginName: PluginName,
    ...rest: Parameters<ConcretePluginMap[PluginName]["importData"]>
  ) => ReturnType<ConcretePluginMap[PluginName]["importData"]>;
}

export abstract class BaseDb<ConcretePluginMap extends PluginMap>
  implements Db<ConcretePluginMap>
{
  // constructor(opts: DbOptions) {}

  abstract importData<PluginName extends keyof ConcretePluginMap>(
    pluginName: PluginName,
    sourceOptions: Parameters<ConcretePluginMap[PluginName]["importData"]>[0],
    destOptions: Parameters<ConcretePluginMap[PluginName]["importData"]>[1]
  ): ReturnType<ConcretePluginMap[PluginName]["importData"]>;
}
