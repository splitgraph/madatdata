import { CommandLineParser } from "@rushstack/ts-command-line";
import { StartServerAction } from "./cmds/server/StartServerAction";
import { DebugAction } from "./cmds/debug/DebugAction";

export class AdminCommandLine extends CommandLineParser {
  public constructor() {
    super({
      toolFilename: "admin",
      toolDescription: "Commands for administering the madatdata stack",
    });

    this.addAction(new StartServerAction());
    this.addAction(new DebugAction());
  }

  protected onDefineParameters(): void {}
}
