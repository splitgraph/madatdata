import type { PluginMap, Plugin } from "./plugin-bindings";

export type PluggableInterfaceShape<
  T extends Record<any, (...args: unknown[]) => unknown> = Record<
    any,
    (...args: any[]) => any
  >
> = {
  [k in keyof T]: T[k] extends Function ? T[k] : never;
};

export type PluginList = Plugin[];

export type PluginListFromMap<ConcretePluginMap extends PluginMap> = (
  | ConcretePluginMap["exporters"][keyof ConcretePluginMap["exporters"]]
  | ConcretePluginMap["importers"][keyof ConcretePluginMap["importers"]]
)[];

export interface WithPluginRegistry<
  ConcretePluginList extends PluginList,
  PluginHostContext extends object,
  PluggableInterface extends PluggableInterfaceShape,
  PluginKindMap extends {
    [k in keyof PluginKindMap]: PluginKindMap[k];
  },
  PluginSelectors extends Readonly<{
    [k in keyof PluginKindMap]: (
      plugin: ConcretePluginList[number]
    ) => plugin is PluginKindMap[k];
  }>
> {
  plugins: PluginRegistry<
    ConcretePluginList,
    PluginHostContext,
    PluggableInterface,
    PluginKindMap,
    PluginSelectors
  >;
}
// NOTE: We're moving away from map, plugins should be unique
// But until then there is a potential for conflict (e.g.: importers.csv and exporters.csv)
// type ValidPluginName<ConcretePluginMap extends PluginMap> =
//   keyof (ConcretePluginMap["exporters"] & ConcretePluginMap["importers"]);

export type ValidPluginNameFromListMatchingType<
  ConcretePluginList extends PluginList,
  MatchingPluginType extends Plugin
> = Extract<ConcretePluginList[number], MatchingPluginType>["__name"];

export const pluginMapToList = <ConcretePluginMap extends PluginMap>(
  pluginMap: ConcretePluginMap
) =>
  [
    ...Object.entries(pluginMap.importers).map(([_, plugin]) => plugin),
    ...Object.entries(pluginMap.exporters).map(([_, plugin]) => plugin),
  ] as ExpandRecursively<PluginListFromMap<ConcretePluginMap>>;

export type PluginsMatchingSelector<
  MatchingPluginType extends Plugin,
  PluginList extends Plugin[],
  Selector extends (
    plugin: PluginList[number]
  ) => plugin is MatchingPluginType = (
    plugin: PluginList[number]
  ) => plugin is MatchingPluginType
> = (plugins: PluginList, selector: Selector) => MatchingPluginType[];

const selectPlugins = <MatchingType extends Plugin>(
  plugins: Plugin[],
  selector: (plugin: Plugin) => plugin is MatchingType
): MatchingType[] => {
  const matchingPlugins = plugins.filter(selector);
  return matchingPlugins;
};

export class PluginRegistry<
  ConcretePluginList extends PluginList,
  PluginHostContext extends object,
  _PluggableInterface extends PluggableInterfaceShape,
  PluginKindMap extends {
    [k in keyof PluginKindMap]: ConcretePluginList[number];
  },
  PluginSelectors extends Readonly<{
    [k in keyof PluginKindMap]: (
      plugin: ConcretePluginList[number]
    ) => plugin is PluginKindMap[k];
  }>,
  ConcretePluginMap extends {
    [k in keyof PluginKindMap]: {
      [j in ConcretePluginList[number]["__name"]]: PluginKindMap[k];
    };
  } = {
    [k in keyof PluginKindMap]: {
      [j in ConcretePluginList[number]["__name"]]: PluginKindMap[k];
    };
  }
> {
  public plugins: ConcretePluginList;
  public hostContext: PluginHostContext;
  public pluginMap: ConcretePluginMap;

  constructor(
    plugins: ConcretePluginList,
    hostContext: PluginHostContext,
    pluginSelectors: PluginSelectors
  ) {
    this.plugins = plugins;
    this.hostContext = hostContext;

    this.pluginMap = Object.entries(pluginSelectors).reduce(
      (acc, [selectorName, selector]) => ({
        ...acc,
        [selectorName]: selectPlugins(
          plugins,
          selector as Parameters<typeof selectPlugins>[1]
        ).reduce((acc, plug) => ({ [plug.__name]: plug, ...acc }), {}),
      }),
      {} as ConcretePluginMap
    );
  }

  // public async callFunction<FunctionName extends keyof PluggableInterface>(
  //   pluginName: ValidPluginName<ConcretePluginMap>,
  //   functionName: FunctionName,
  //   ...rest: Parameters<PluggableInterface[FunctionName]>
  // ) {
  //   console.log(
  //     `<pluginName=${String(pluginName)}> CALL <functionName=${String(
  //       functionName
  //     )}> with ARGS <${JSON.stringify({ rest })}>`
  //   );
  // }

  public get helpers() {
    return;
  }
}

// type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;
type ExpandRecursively<T> = T extends object
  ? T extends infer O
    ? { [K in keyof O]: ExpandRecursively<O[K]> }
    : never
  : T;
// type ExpandFunction<F extends Function> = F extends
//   (...args: infer A) => infer R ? (...args: Expand<A>) => Expand<R> : never;