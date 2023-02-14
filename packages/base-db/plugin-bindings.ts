export type WithOptions<OuterClassT> = <
  InjectedOpts extends {},
  InnerClassT extends OuterClassT
>(
  injectOpts: InjectedOpts
) => InnerClassT | OuterClassT;

export interface WithOptionsInterface<ClassT> {
  withOptions: WithOptions<ClassT>;
}

export interface BasePlugin<PluginName extends string> {
  // importData: <
  //   SourceOptions extends Record<PropertyKey, unknown>,
  //   DestOptions extends Record<PropertyKey, unknown>,
  //   ResultShape extends Record<PropertyKey, unknown>,
  //   ErrorShape extends Record<PropertyKey, unknown>
  // >(
  //   sourceOptions: SourceOptions,
  //   destOptions: DestOptions
  // ) => Promise<{ response: ResultShape | null; error: ErrorShape | null }>;

  readonly __name: PluginName;

  graphqlEndpoint?: string;

  // withOptions: WithOptions<BasePlugin>;
}

// export abstract class

export interface ImportPlugin<PluginName extends string>
  extends BasePlugin<PluginName> {
  withOptions: WithOptions<ImportPlugin<PluginName>>;
  importData: (
    sourceOptions: any,
    destOptions: any
  ) => Promise<{ response: any | null; error: any | null; info?: any | null }>;
}

export interface ExportPlugin<PluginName extends string>
  extends BasePlugin<PluginName> {
  withOptions: WithOptions<ExportPlugin<PluginName>>;
  exportData: (
    sourceOptions: any,
    destOptions: any
  ) => Promise<{ response: any | null; error: any | null; info?: any | null }>;
}

// export type Plugin = ImportPlugin | ExportPlugin;

export type Plugin = BasePlugin<string>;
