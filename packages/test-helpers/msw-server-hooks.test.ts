import { describe, it, expect, beforeEach } from "vitest";
import { setupMswServerTestHooks } from "./msw-server-hooks";
import { rest } from "msw";

/**
 * Test that we can setup an msw "server", which will be using `FetchInterceptor`
 * because it's provided by our patched version of `msw` (see yarn patch)
 *
 * (Currently, this behavior is provided by our patch (managed with Yarn patch)
 * until the upstream package changes to instantiate FetchInterceptor by default)
 *
 * Note: We know that if the request is intercepted, it must be
 * using `FetchInterceptor`, because we are not including the `cross-fetch`
 * polyfill in our test environment, and so if the tests pass, they're passing
 * using the node "native" fetch, i.e. new global `fetch` provided by `undici`
 */
describe("setupMswServerTestHooks", () => {
  setupMswServerTestHooks();

  beforeEach(({ mswServer }) => {
    mswServer?.use(
      rest.get("http://www.httpbin.org/headers", (_req, res, ctx) => {
        return res(
          ctx.json({
            success: true,
          })
        );
      })
    );
  });

  it("intercepts HTTP GET request", async () => {
    const response = await fetch("http://www.httpbin.org/headers");

    expect(response).toBeDefined();

    expect(await response.text()).toMatchInlineSnapshot(
      '"{\\"success\\":true}"'
    );
  });
});
