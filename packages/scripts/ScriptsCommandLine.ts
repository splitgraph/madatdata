import { CommandLineParser } from "@rushstack/ts-command-line";
import { StartServerAction } from "./cmds/server/StartServerAction";
import { DebugAction } from "./cmds/debug/DebugAction";

export class ScriptsCommandLine extends CommandLineParser {
  public constructor() {
    super({
      toolFilename: "scripts",
      toolDescription: "Commands and scripts for the madatdata stack",
    });

    this.addAction(new StartServerAction());
    this.addAction(new DebugAction());
  }

  protected onDefineParameters(): void {}
}
