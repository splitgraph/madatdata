import type { Plugin } from "./plugin-bindings";

export type PluginList<PluginKind extends Plugin = Plugin> =
  readonly PluginKind[];

export type PluginMap<
  ConcretePluginList extends PluginList,
  PluginKindMap extends {
    [k in keyof PluginKindMap]: PluginKindMap[k];
  }
> = {
  [k in keyof PluginKindMap]: {
    [pluginName in ValidPluginNameFromListMatchingType<
      ConcretePluginList,
      PluginKindMap[k]
    >]: ExtractPlugin<ConcretePluginList, PluginKindMap[k]>;
  };
};

export type PluggableInterfaceShape<
  T extends Record<any, (...args: unknown[]) => unknown> = Record<
    any,
    (...args: any[]) => any
  >
> = {
  [k in keyof T]: T[k] extends Function ? T[k] : never;
};

export interface WithPluginRegistry<
  ConcretePluginList extends PluginList,
  PluginHostContext extends object,
  PluggableInterface extends PluggableInterfaceShape
> {
  plugins: PluginRegistry<
    ConcretePluginList,
    PluginHostContext,
    PluggableInterface
  >;
}
export type ExtractPlugin<
  ConcretePluginList extends PluginList,
  MatchingPluginType extends Plugin
> = Extract<ConcretePluginList[number], MatchingPluginType>;

export type ValidPluginNameFromListMatchingType<
  ConcretePluginList extends PluginList,
  MatchingPluginType extends Plugin
> = ExtractPlugin<ConcretePluginList, MatchingPluginType>["__name"];

export type PluginsMatchingSelector<
  MatchingPluginType extends Plugin,
  PluginList extends Plugin[],
  Selector extends (
    plugin: PluginList[number]
  ) => plugin is MatchingPluginType = (
    plugin: PluginList[number]
  ) => plugin is MatchingPluginType
> = (plugins: PluginList, selector: Selector) => MatchingPluginType[];

// const selectPlugins = <MatchingType extends Plugin>(
//   plugins: Plugin[],
//   selector: (plugin: Plugin) => plugin is MatchingType
// ): MatchingType[] => {
//   const matchingPlugins = plugins.filter(selector);
//   return matchingPlugins;
// };

// const selectFirstMatchingPlugin

export class PluginRegistry<
  ConcretePluginList extends PluginList,
  PluginHostContext extends object,
  _PluggableInterface extends PluggableInterfaceShape
> {
  public readonly plugins: ConcretePluginList;
  public hostContext: PluginHostContext;

  constructor(plugins: ConcretePluginList, hostContext: PluginHostContext) {
    this.plugins = plugins;
    this.hostContext = hostContext;
  }

  selectMatchingPlugins<MatchingType extends ConcretePluginList[number]>(
    selector: (plugin: ConcretePluginList[number]) => plugin is MatchingType
  ): MatchingType[] {
    const matchingPlugins = this.plugins.filter(selector);
    return matchingPlugins;
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
// type ExpandRecursively<T> = T extends object
//   ? T extends infer O
//     ? { [K in keyof O]: ExpandRecursively<O[K]> }
//     : never
//   : T;
// type ExpandFunction<F extends Function> = F extends
//   (...args: infer A) => infer R ? (...args: Expand<A>) => Expand<R> : never;
