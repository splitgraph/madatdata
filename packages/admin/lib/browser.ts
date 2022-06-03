import { webkit, chromium } from "playwright";

const proxyOpts = !!process.env["HTTP_PROXY"]
  ? { server: process.env["HTTP_PROXY"] }
  : undefined;

export const makeInsecureBrowser = async () => {
  const browser = await (
    await webkit.launch({
      proxy: proxyOpts,
    })
  ).newContext({ ignoreHTTPSErrors: true });

  return { browser };
};

export const makeBrowser = async () => {
  const browser = await webkit.launch();
  return { browser };
};

export const makePersistentBrowser = async (dataDir: string) => {
  const browser = await chromium.launchPersistentContext(dataDir, {
    proxy: proxyOpts,
    bypassCSP: true,
    ignoreHTTPSErrors: true,
    devtools: false,
    headless: false,
    slowMo: 2000,
    // recordVideo: {
    //   dir: ".data",
    // },
  });

  return { browser };
};

namespace NodeJS {
  interface ProcessEnv {
    HTTP_PROXY?: string;
  }
}
