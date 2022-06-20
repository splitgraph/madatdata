export const helloWorld = () => {
  console.log("Hello world from base-db");
  return "hello world";
};

export interface Db<PluginMap extends Record<string, unknown>> {
  importData: <
    PluginName extends keyof PluginMap,
    SourceOptions extends Record<PropertyKey, unknown>,
    DestOptions extends Record<PropertyKey, unknown>,
    ImportResultShape extends Record<PropertyKey, unknown>,
    ImportErrorShape extends Record<PropertyKey, unknown>
  >(
    plugin: PluginName,
    source: SourceOptions,
    dest: DestOptions
  ) => Promise<{
    response: ImportResultShape | null;
    error: ImportErrorShape | null;
  }>;
}

export abstract class BaseDb<PluginMap extends Record<string, unknown>>
  implements Db<PluginMap>
{
  // constructor(opts: DbOptions) {}

  abstract importData<
    PluginName extends keyof PluginMap,
    SourceOptions extends Record<PropertyKey, unknown>,
    DestOptions extends Record<PropertyKey, unknown>,
    ImportResultShape extends Record<PropertyKey, unknown>,
    ImportErrorShape extends Record<PropertyKey, unknown>
  >(
    plugin: PluginName,
    source: SourceOptions,
    dest: DestOptions
  ): Promise<{
    response: ImportResultShape | null;
    error: ImportErrorShape | null;
  }>;
}
