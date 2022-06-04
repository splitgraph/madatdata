import { CommandLineAction } from "@rushstack/ts-command-line";
import { chromium } from "playwright";
import chalk from "chalk";
import path from "path";

export class OpenDevtoolsAction extends CommandLineAction {
  persistentBrowserSessionId: string = "debugging";

  public constructor() {
    super({
      actionName: "open-devtools",
      summary:
        "Launch Chromium with Playwright and open dedicated DevTools for Node",
      documentation:
        "Run this script after a Node service starts listening on a debugging port, " +
        "i.e.run this script in a separte window after --inspect - brk",
    });
  }

  protected onDefineParameters(): void {
    // stub (abstract method required)
  }

  protected async onExecute(): Promise<void> {
    // no need to create .data/sessions directory; playwright will do it for us
    try {
      const debugConfig = await getDebugConfig();

      await openDevtools({
        debugConfig,
      });
    } catch (openDevtoolsError) {
      console.error(
        chalk.red("Error"),
        "Encountered exception during openDevtools."
      );
      console.error(chalk.yellow("Traceback:"));
      console.trace(openDevtoolsError);
    }
  }
}

// TODO: async for now so that later it can get cdp uuid from another process
export const getDebugConfig = async (opts?: { sessionId?: string }) => {
  const { sessionId = "debugging" } = opts ?? {};

  return Promise.resolve({
    userDataDir: path.join(".data", "sessions", sessionId),

    inspectorURL: "chrome://inspect/#devices",

    // TODO: This one works if we have the ID from the node process being debugged
    // devtoolsURL:
    //   "devtools://devtools/bundled/node_app.html?ws=127.0.0.1:9229/d48ec8d2-8e9a-47be-bf00-1e2c47ea8f0d",
  });
};

type DebugConfig = Unpromise<ReturnType<typeof getDebugConfig>>;

type OpenDevToolsOpts = {
  debugConfig: DebugConfig;
};

const openDevtools = async ({ debugConfig }: OpenDevToolsOpts) => {
  const browser = await chromium.launchPersistentContext(
    debugConfig.userDataDir,
    {
      ignoreHTTPSErrors: true,
    }
  );

  const page = await browser.newPage();

  await page.goto(debugConfig.inspectorURL);
  await page.locator("#node-frontend").click();
};
