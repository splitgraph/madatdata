type ImportDataFunction = <SourceOptions, DestOptions>(
  sourceOptions: SourceOptions,
  destOptions: DestOptions
) => Promise<{ response: unknown | null; error: unknown | null }>;

export interface Plugin {
  importData: ImportDataFunction;
}
export interface PluginMap {
  [pluginName: string]: Plugin;
}

export interface Db<ConcretePluginMap extends PluginMap> {
  importData: ConcretePluginMap[string]["importData"];
}

export abstract class BaseDb<ConcretePluginMap extends PluginMap>
  implements Db<ConcretePluginMap>
{
  // constructor(opts: DbOptions) {}

  // abstract importData(
  //   plugin
  //   sourceOptions,
  //   destOptions,
  // ): ReturnType<ConcretePluginMap[PluginName]["importData"]>;

  abstract importData: ImportDataFunction;

  // abstract importData<SourceOptions, DestOptions>(
  //   sourceOptions: SourceOptions,
  //   destOptions: DestOptions
  // ): Promise<{ response: unknown | null; error: unknown | null }>;
}

type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;
