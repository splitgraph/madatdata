export interface PluginMap {
  [pluginName: string]: Plugin;
}

export interface Plugin {
  importData: <SourceOptions, DestOptions, ResultShape, ErrorShape>(
    sourceOptions: SourceOptions,
    destOptions: DestOptions
  ) => Promise<{ response: ResultShape | null; error: ErrorShape | null }>;
}

// export type PluginMap = Map<string, Plugin>;
