import { chalk, echo } from "zx";

void (async function () {
  echo(chalk.green("[CWD]"), process.cwd());
})();
