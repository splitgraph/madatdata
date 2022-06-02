import chalk from "chalk";
import { CommandLineAction } from "@rushstack/ts-command-line";

import { startServer } from "./server";

export class StartServerAction extends CommandLineAction {
  public constructor() {
    super({
      actionName: "start-server",
      summary: "Start the Strapi server",
      documentation: "Start the server",
    });
  }

  protected onDefineParameters(): void {
    // stub (abstract method required)
  }

  protected async onExecute(): Promise<void> {
    try {
      await startServer();
    } catch (startServerError) {
      console.error(
        chalk.red("Error"),
        "Encountered exception during startServer."
      );
      console.error(chalk.yellow("Traceback:"));
      console.trace(startServerError);
    }
  }
}
