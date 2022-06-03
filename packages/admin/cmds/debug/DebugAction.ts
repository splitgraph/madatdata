import chalk from "chalk";
import { CommandLineAction } from "@rushstack/ts-command-line";

import { openDevtools } from "./devtools";
import { makePersistentBrowser as makeBrowser } from "@madatdata/admin/lib/browser";
import { getDebugConfig } from "./debug-config";

// todo: get from args
const sessionID = "debugging";

export class DebugAction extends CommandLineAction {
  public constructor() {
    super({
      actionName: "debug",
      summary: "Open devtools in chromium (via playwright) to node inspector",
      documentation: "",
    });
  }

  protected onDefineParameters(): void {
    // stub (abstract method required)
  }

  protected async onExecute(): Promise<void> {
    // no need to create .data/sessions directory; playwright will do it for us
    const { browser } = await makeBrowser(`.data/sessions/${sessionID}`);
    try {
      await openDevtools({
        browser,
        debugConfig: getDebugConfig(),
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
