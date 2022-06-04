import { CommandLineParser } from "@rushstack/ts-command-line";
import { OpenDevtoolsAction } from "./cmds/open-devtools";

export class YeetCommandLine extends CommandLineParser {
  public constructor() {
    super({
      toolFilename: "yeet",
      toolDescription: "a yeeter that yeets things",
    });

    this.addAction(new OpenDevtoolsAction());
  }

  protected onDefineParameters(): void {}
}
