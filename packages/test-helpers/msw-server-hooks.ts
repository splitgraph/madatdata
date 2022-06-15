import { afterAll, afterEach, beforeAll } from "vitest";
import type { SetupServerApi } from "msw/node";

/**
 * Calls the vitest hooks required to set up msw server during the tests and
 * tear it down after the tests are done.
 *
 * @see https://mswjs.io/docs/getting-started/integrate/node
 */
export const setupMswServerTestHooks = (mswServer: SetupServerApi) => {
  beforeAll(() => {
    mswServer.listen();
  });
  afterEach(() => {
    mswServer.resetHandlers();
  });
  afterAll(() => {
    mswServer.close();
  });
};
