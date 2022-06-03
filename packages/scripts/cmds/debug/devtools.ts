// import chalk from "chalk";
// import process from "process";
// import { CommandLineAction } from "@rushstack/ts-command-line";

// import { startScrape, startPassiveScrape } from "./scrape-slack";
// import { makePersistentBrowser as makeBrowser } from "@madatdata/scripts/lib/browser";

import type { BrowserContext } from "playwright";

import type { DebugConfig } from "./debug-config";

type OpenDevToolsOpts = {
  browser: BrowserContext;
  debugConfig: DebugConfig;
};

export const openDevtools = async ({
  browser,
  debugConfig,
}: OpenDevToolsOpts) => {
  const page = await browser.newPage();
  await page.goto(debugConfig.inspectorURL);

  // debugger;

  browser.on("page", (newPage) => {
    console.log("new page opened", newPage.url());
  });

  // browser.on("popup", (newPopup) => {
  //   console.log("new popup opened", newPopup.url());
  // });

  await page.locator("#node-frontend").click();

  // const [devtoolsPage] = await Promise.all([
  //   browser.waitForEvent("popup"),
  //   page.locator("#node-frontend").click(),
  // ]);

  console.log("we out here!!! yoo");

  // console.log(devtoolsPage.url());

  // console.log(browser.pages().pop()?.url());
};
