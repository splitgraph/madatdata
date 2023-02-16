import { describe, it, expect, vi } from "vitest";
import type {
  Expect,
  Equal,
  NotEqual,
} from "@madatdata/test-helpers/type-test-utils";
import { PluginList, PluginRegistry } from "./plugin-registry";

type SomeKindOfChampionPlugin = {
  __name: string;
  celebrateVictory: (...args: any[]) => Promise<unknown>;
};

type SomeKindOfLoserPlugin = {
  __name: string;
  announceRetirement: (...args: any[]) => Promise<unknown>;
};

type PluggableInterface = SomeKindOfChampionPlugin | SomeKindOfLoserPlugin;

/**
 * Make a fake object that is "pluggable" in the same way that e.g. BaseDb is "pluggable",
 * specifically, return an object where .plugins is set to a PluginRegistry instantiated with [plugins]
 */
const makeSomethingPluggable = <
  ConcretePluginList extends PluginList<PluggableInterface>
>(
  plugins: ConcretePluginList,
  pluginHostContext: object
) => {
  const pluginRegistry = new PluginRegistry(plugins, pluginHostContext);

  return {
    plugins: pluginRegistry,

    /**
     * This function is analogous to BaseDb.importData() or BaseDb.exportData()
     *
     * It takes a pluginName, finds a plugin with that pluginName and the celebrateVictory()
     * method, and calls that plugin with its args
     */
    celebrateVictory: async <
      PluginName extends Extract<
        ConcretePluginList[number],
        SomeKindOfChampionPlugin
      >["__name"],
      GoatPlugin extends Extract<
        ConcretePluginList[number],
        SomeKindOfChampionPlugin
      > & { __name: PluginName }
    >(
      pluginName: PluginName,
      ...victoryArgs: Parameters<GoatPlugin["celebrateVictory"]>
    ) => {
      const championPlugins = pluginRegistry.selectMatchingPlugins(
        // NOTE: (subtle) if plugin were a class, we would need `in Object.getPrototypeOf(plugin)`
        // FIXME: (ideally, we should handle those two cases transparently to the caller)
        (plugin): plugin is SomeKindOfChampionPlugin =>
          "celebrateVictory" in plugin && plugin.__name === pluginName
      );

      {
        true as Expect<
          Equal<typeof championPlugins[number], SomeKindOfChampionPlugin>
        >;

        true as Expect<
          NotEqual<typeof championPlugins[number], SomeKindOfLoserPlugin>
        >;

        // cannot be PluggableInterface because type predicate only matches SomeKindOfChampionPlugin
        true as Expect<
          NotEqual<typeof championPlugins[number], PluggableInterface>
        >;
      }

      // GoatPlugin is narrower version of SomeKindOfChampionPlugin
      const goatPlugin = pluginRegistry
        .selectMatchingPlugins(
          (plugin): plugin is GoatPlugin =>
            "celebrateVictory" in plugin && plugin.__name === pluginName
        )
        .pop();

      if (!goatPlugin) {
        throw new Error("plugin not found");
      }

      goatPlugin.celebrateVictory(...victoryArgs);
    },
  };
};

/**
 * Make a fake set of plugins where each implements SomeKindOfChampionPlugin | SomeKindOfLoserPlugin
 * This can be passed to makeSomethingPluggable(), and (ideally) used for narrowing of parameters
 * of functions on the object returned by makeSomethingPluggable(makeFakePlugins())
 */
const makeFakePlugins = ({
  onCelebrateVictory = async (name: string) => {
    await Promise.resolve();
    console.log("Yay, victory! Thank you to", name);
  },
  onDecideRetirement = async (name: string, retiring: boolean) => {
    await Promise.resolve();
    if (retiring) {
      console.log(
        `I (${name} officially suck, it's time to hang up the cleats`
      );
    } else {
      console.log("I'm taking it day by day");
    }
  },
}: {
  onCelebrateVictory: (name: string) => Promise<void>;
  onDecideRetirement: (name: string, retiring: boolean) => Promise<void>;
}) => {
  return [
    {
      __name: "happy-winner" as const,
      celebrateVictory: async (
        name: string,
        speechOpts: { thankParents: boolean }
      ) => {
        await Promise.resolve();
        if (speechOpts.thankParents) {
          onCelebrateVictory(`${name} (and my mom and dad)`);
        } else {
          onCelebrateVictory(`${name} and ${name} only!`);
        }
      },
    },
    {
      __name: "sad-loser" as const,
      announceRetirement: async (
        name: string,
        speechOpts: { takeItDayByDay: boolean }
      ) => {
        await Promise.resolve();
        onDecideRetirement(name, speechOpts.takeItDayByDay);
      },
    },
  ] as const;
};

describe("plugin registry", () => {
  it("satisfies expected type assertions", async () => {
    const pluginHostContext = {
      someFakeThing: "foobar",
    };

    const defaultOnCelebrateVictory = vi.fn();
    const defaultOnDecideRetirement = vi.fn();

    const fakePlugins = makeFakePlugins({
      onCelebrateVictory: defaultOnCelebrateVictory,
      onDecideRetirement: defaultOnDecideRetirement,
    });

    const pluggable = makeSomethingPluggable<
      ReturnType<typeof makeFakePlugins>
    >(fakePlugins, pluginHostContext);

    {
      true as Expect<
        Equal<
          typeof pluggable["plugins"]["plugins"],
          ReturnType<typeof makeFakePlugins>
        >
      >;

      true as Expect<
        Equal<
          Extract<
            typeof pluggable["plugins"]["plugins"][number],
            SomeKindOfChampionPlugin
          >["__name"],
          "happy-winner"
        >
      >;

      true as Expect<
        Equal<
          ReturnType<typeof pluggable.plugins.selectMatchingPlugins>,
          ReturnType<typeof makeFakePlugins>[number][]
        >
      >;

      true as Expect<
        Equal<
          Extract<
            typeof pluggable["plugins"]["plugins"][number],
            SomeKindOfChampionPlugin
          >["__name"],
          "happy-winner"
        >
      >;
      true as Expect<
        Equal<
          Parameters<typeof pluggable["celebrateVictory"]>[0],
          "happy-winner"
        >
      >;
    }

    // Call .selectMatchingPlugins() to get matching plugin of expected type
    const championPlugins = pluggable.plugins.selectMatchingPlugins(
      (
        maybeCelebrator
      ): maybeCelebrator is Extract<
        ReturnType<typeof makeFakePlugins>,
        SomeKindOfChampionPlugin
      > => "celebrateVictory" in maybeCelebrator
    );
    {
      true as Expect<
        Equal<
          typeof championPlugins,
          Extract<
            ReturnType<typeof makeFakePlugins>,
            SomeKindOfChampionPlugin
          >[]
        >
      >;
    }

    {
      // IMPORTANT: This is the test for pass-through arguments, e.g. the ...rest
      // in  db.importData("csv", ...rest) where ...rest should match parameters of
      // the importData method on any plugin that implements it and also has the name of "csv"
      true as Expect<
        Equal<
          Parameters<typeof pluggable.celebrateVictory>,
          Parameters<
            (
              pluginName: "happy-winner",
              name: string,
              speechOpts: { thankParents: boolean }
            ) => void
          >
        >
      >;

      true as Expect<
        Equal<
          Parameters<
            Extract<
              ReturnType<typeof makeFakePlugins>[number],
              SomeKindOfChampionPlugin & { __name: "happy-winner" }
            >["celebrateVictory"]
          >,
          [name: string, speechOpts: { thankParents: boolean }]
        >
      >;
    }

    // FIXME: these arguments are untyped (see FIXME in type assertion above)
    await pluggable.celebrateVictory("happy-winner", "Mr Winner Face", {
      thankParents: false,
    });
    expect(defaultOnCelebrateVictory).toHaveBeenCalledOnce();
    expect(defaultOnCelebrateVictory).toHaveBeenLastCalledWith(
      "Mr Winner Face and Mr Winner Face only!"
    );

    await pluggable.celebrateVictory("happy-winner", "Mr Winner Face", {
      thankParents: true,
    });
    expect(defaultOnCelebrateVictory).toHaveBeenLastCalledWith(
      "Mr Winner Face (and my mom and dad)"
    );
  });
});
