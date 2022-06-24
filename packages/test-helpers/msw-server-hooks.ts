import { afterAll, afterEach, beforeAll, beforeEach } from "vitest";
import { setupServer } from "msw/node";

/**
 * Calls the vitest hooks required to set up msw server during the tests and
 * tear it down after the tests are done.
 *
 * @see https://mswjs.io/docs/getting-started/integrate/node
 */
export const setupMswServerTestHooks = () => {
  beforeAll((suiteCtx) => {
    suiteCtx.mswServer = setupServer();
    suiteCtx.mswServer.listen();
  });

  beforeEach((testCtx, suiteCtx) => {
    testCtx.mswServer = suiteCtx.mswServer;
  });

  afterEach((testCtx, suiteCtx) => {
    testCtx.mswServer?.resetHandlers();
    suiteCtx.mswServer = testCtx.mswServer;
  });
  afterAll((suiteCtx) => {
    suiteCtx.mswServer?.close();
  });
};

declare module "vitest" {
  export interface Suite {
    mswServer?: ReturnType<typeof setupServer>;
  }
  export interface TestContext {
    mswServer?: ReturnType<typeof setupServer>;
  }
}
