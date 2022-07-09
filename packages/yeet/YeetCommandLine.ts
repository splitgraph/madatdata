import { CommandLineParser } from "@rushstack/ts-command-line";
import { OpenDevtoolsAction } from "./actions/open-devtools";
import { CheckGlobPatternsAction } from "./actions/check-glob-patterns";

export class YeetCommandLine extends CommandLineParser {
  public constructor() {
    super({
      toolFilename: "yeet",
      toolDescription: "a yeeter that yeets things",
    });

    this.addAction(new OpenDevtoolsAction());
    this.addAction(new CheckGlobPatternsAction());
  }

  protected onDefineParameters(): void {}
}
