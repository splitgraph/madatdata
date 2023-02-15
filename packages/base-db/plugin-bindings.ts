export type WithOptions<OuterClassT> = <
  InjectedOpts extends {},
  InnerClassT extends OuterClassT
>(
  injectOpts: InjectedOpts
) => InnerClassT | OuterClassT;

// TODO: rename this to not be exclusive to just "withOptions" (and even if it
// were limited to that, the accurate name would be `WithWithOptionsInterface`)

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
