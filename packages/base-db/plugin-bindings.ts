export type WithOptions<OuterClassT> = <
  InjectedOpts extends {},
  InnerClassT extends OuterClassT
>(
  injectOpts: InjectedOpts
) => InnerClassT | OuterClassT;

export interface WithOptionsInterface<ClassT> {
  withOptions: WithOptions<ClassT>;
}

export interface BasePlugin {
  readonly __name: string;

  graphqlEndpoint?: string;
}

// export abstract class

// export type Plugin = ImportPlugin | ExportPlugin;

export type Plugin = BasePlugin;
