import { CommandLineParser } from "@rushstack/ts-command-line";
import { StartServerAction } from "@madatdata/admin/cmds/server";

export class AdminCommandLine extends CommandLineParser {
  public constructor() {
    super({
      toolFilename: "admin",
      toolDescription: "Commands for administering the madatdata stack",
    });

    this.addAction(new StartServerAction());
  }

  protected onDefineParameters(): void {}
}
