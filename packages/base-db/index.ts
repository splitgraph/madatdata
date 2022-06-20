export interface PluginMap {
  [pluginName: string]: {
    importData: {
      sourceOptions: Record<PropertyKey, unknown>;
      destOptions: Record<PropertyKey, unknown>;
      resultShape: Record<PropertyKey, unknown>;
      errorShape: Record<PropertyKey, unknown>;
    };
  };
}

export interface Db<ConcretePluginMap extends PluginMap> {
  importData: <
    PluginName extends keyof ConcretePluginMap,
    SourceOptions extends ConcretePluginMap[PluginName]["importData"]["sourceOptions"],
    DestOptions extends ConcretePluginMap[PluginName]["importData"]["destOptions"],
    ImportResultShape extends ConcretePluginMap[PluginName]["importData"]["resultShape"],
    ImportErrorShape extends ConcretePluginMap[PluginName]["importData"]["errorShape"]
  >(
    plugin: PluginName,
    source: SourceOptions,
    dest: DestOptions
  ) => Promise<{
    response: ImportResultShape | null;
    error: ImportErrorShape | null;
  }>;
}

export abstract class BaseDb<ConcretePluginMap extends PluginMap>
  implements Db<ConcretePluginMap>
{
  // constructor(opts: DbOptions) {}

  abstract importData<
    PluginName extends keyof ConcretePluginMap,
    SourceOptions extends ConcretePluginMap[PluginName]["importData"]["sourceOptions"],
    DestOptions extends ConcretePluginMap[PluginName]["importData"]["destOptions"],
    ImportResultShape extends ConcretePluginMap[PluginName]["importData"]["resultShape"],
    ImportErrorShape extends ConcretePluginMap[PluginName]["importData"]["errorShape"]
  >(
    plugin: PluginName,
    source: SourceOptions,
    dest: DestOptions
  ): Promise<{
    response: ImportResultShape | null;
    error: ImportErrorShape | null;
  }>;
}
